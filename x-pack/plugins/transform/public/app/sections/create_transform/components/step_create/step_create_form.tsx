/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiCard,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';

import { DuplicateDataViewError } from '@kbn/data-plugin/public';
import type { RuntimeField } from '@kbn/data-views-plugin/common';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { PROGRESS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { getTransformProgress } from '../../../../common';
import { useCreateTransform, useGetTransformStats, useStartTransforms } from '../../../../hooks';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { RedirectToTransformManagement } from '../../../../common/navigation';
import { ToastNotificationText } from '../../../../components';
import {
  PutTransformsLatestRequestSchema,
  PutTransformsPivotRequestSchema,
} from '../../../../../../common/api_schemas/transforms';
import { isContinuousTransform, isLatestTransform } from '../../../../../../common/types/transform';
import { TransformAlertFlyout } from '../../../../../alerting/transform_alerting_flyout';

export interface StepDetailsExposedState {
  created: boolean;
  started: boolean;
  dataViewId: string | undefined;
}

export function getDefaultStepCreateState(): StepDetailsExposedState {
  return {
    created: false,
    started: false,
    dataViewId: undefined,
  };
}

export interface StepCreateFormProps {
  createDataView: boolean;
  transformId: string;
  transformConfig: PutTransformsPivotRequestSchema | PutTransformsLatestRequestSchema;
  overrides: StepDetailsExposedState;
  timeFieldName?: string | undefined;
  onChange(s: StepDetailsExposedState): void;
}

export const StepCreateForm: FC<StepCreateFormProps> = React.memo(
  ({ createDataView, transformConfig, transformId, onChange, overrides, timeFieldName }) => {
    const defaults = { ...getDefaultStepCreateState(), ...overrides };

    const [redirectToTransformManagement, setRedirectToTransformManagement] = useState(false);

    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(defaults.created);
    const [started, setStarted] = useState(defaults.started);
    const [alertFlyoutVisible, setAlertFlyoutVisible] = useState(false);
    const [dataViewId, setDataViewId] = useState(defaults.dataViewId);
    const [progressPercentComplete, setProgressPercentComplete] = useState<undefined | number>(
      undefined
    );
    const [discoverLink, setDiscoverLink] = useState<string>();

    const toastNotifications = useToastNotifications();
    const { application, data, i18n: i18nStart, share, theme } = useAppDependencies();
    const dataViews = data.dataViews;
    const isDiscoverAvailable = application.capabilities.discover?.show ?? false;

    useEffect(() => {
      let unmounted = false;

      onChange({ created, started, dataViewId });

      const getDiscoverUrl = async (): Promise<void> => {
        const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);

        if (!locator) return;

        const discoverUrl = await locator.getUrl({
          indexPatternId: dataViewId,
        });

        if (!unmounted) {
          setDiscoverLink(discoverUrl);
        }
      };

      if (started === true && dataViewId !== undefined && isDiscoverAvailable) {
        getDiscoverUrl();
      }

      return () => {
        unmounted = true;
      };
      // custom comparison
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [created, started, dataViewId]);

    const startTransforms = useStartTransforms();
    const createTransform = useCreateTransform();

    function createTransformHandler(startAfterCreation = false) {
      setLoading(true);

      createTransform(
        { transformId, transformConfig },
        {
          onError: () => setCreated(false),
          onSuccess: () => {
            setCreated(true);
            if (createDataView) {
              createKibanaDataView();
            }
            if (startAfterCreation) {
              startTransform();
            }
          },
          onSettled: () => setLoading(false),
        }
      );
    }

    function startTransform() {
      setLoading(true);

      startTransforms([{ id: transformId }], {
        onError: () => setStarted(false),
        onSuccess: (resp) => setStarted(resp[transformId]?.success === true),
        onSettled: () => setLoading(false),
      });
    }

    const createKibanaDataView = async () => {
      setLoading(true);
      const dataViewName = transformConfig.dest.index;
      const runtimeMappings = transformConfig.source.runtime_mappings as Record<
        string,
        RuntimeField
      >;

      try {
        const newDataView = await dataViews.createAndSave(
          {
            title: dataViewName,
            timeFieldName,
            ...(isPopulatedObject(runtimeMappings) && isLatestTransform(transformConfig)
              ? { runtimeFieldMap: runtimeMappings }
              : {}),
            allowNoIndex: true,
          },
          false,
          true
        );

        setDataViewId(newDataView.id);
        setLoading(false);
        return true;
      } catch (e) {
        if (e instanceof DuplicateDataViewError) {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.stepCreateForm.duplicateDataViewErrorMessage', {
              defaultMessage:
                'An error occurred creating the Kibana data view {dataViewName}: The data view already exists.',
              values: { dataViewName },
            })
          );
        } else {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepCreateForm.createDataViewErrorMessage', {
              defaultMessage: 'An error occurred creating the Kibana data view {dataViewName}:',
              values: { dataViewName },
            }),
            text: toMountPoint(<ToastNotificationText text={getErrorMessage(e)} />, {
              theme,
              i18n: i18nStart,
            }),
          });
          setLoading(false);
          return false;
        }
      }
    };

    const isBatchTransform = typeof transformConfig.sync === 'undefined';

    useEffect(() => {
      if (
        loading === false &&
        started === true &&
        progressPercentComplete === undefined &&
        isBatchTransform
      ) {
        setProgressPercentComplete(0);
      }
    }, [loading, started, progressPercentComplete, isBatchTransform]);

    const progressBarRefetchEnabled =
      isBatchTransform &&
      typeof progressPercentComplete === 'number' &&
      progressPercentComplete < 100;
    const progressBarRefetchInterval = progressBarRefetchEnabled
      ? PROGRESS_REFRESH_INTERVAL_MS
      : false;

    const { data: stats } = useGetTransformStats(
      transformId,
      progressBarRefetchEnabled,
      progressBarRefetchInterval
    );

    useEffect(() => {
      if (stats === undefined) {
        return;
      }

      if (stats && Array.isArray(stats.transforms) && stats.transforms.length > 0) {
        const percent =
          getTransformProgress({
            id: transformId,
            config: {
              ...transformConfig,
              id: transformId,
            },
            stats: stats.transforms[0],
          }) || 0;
        setProgressPercentComplete(percent);
      } else {
        toastNotifications.addDanger({
          title: i18n.translate('xpack.transform.stepCreateForm.progressErrorMessage', {
            defaultMessage: 'An error occurred getting the progress percentage:',
          }),
          text: toMountPoint(<ToastNotificationText text={getErrorMessage(stats)} />, {
            theme,
            i18n: i18nStart,
          }),
        });
      }
    }, [i18nStart, stats, theme, toastNotifications, transformConfig, transformId]);

    function getTransformConfigDevConsoleStatement() {
      return `PUT _transform/${transformId}\n${JSON.stringify(transformConfig, null, 2)}\n\n`;
    }

    // TODO move this to SASS
    const FLEX_GROUP_STYLE = { height: '90px', maxWidth: '800px' };
    const FLEX_ITEM_STYLE = { width: '200px' };
    const PANEL_ITEM_STYLE = { width: '300px' };

    if (redirectToTransformManagement) {
      return <RedirectToTransformManagement />;
    }

    return (
      <div data-test-subj="transformStepCreateForm">
        <EuiForm>
          {!created && (
            <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
              <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
                <EuiButton
                  fill
                  isDisabled={loading || (created && started)}
                  onClick={() => createTransformHandler(true)}
                  data-test-subj="transformWizardCreateAndStartButton"
                >
                  {i18n.translate('xpack.transform.stepCreateForm.createAndStartTransformButton', {
                    defaultMessage: 'Create and start',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate(
                    'xpack.transform.stepCreateForm.createAndStartTransformDescription',
                    {
                      defaultMessage:
                        'Creates and starts the transform. A transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. After the transform is started, you will be offered options to continue exploring the transform.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {created && (
            <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
              <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
                <EuiButton
                  fill
                  isDisabled={loading || (created && started)}
                  onClick={startTransform}
                  data-test-subj="transformWizardStartButton"
                >
                  {i18n.translate('xpack.transform.stepCreateForm.startTransformButton', {
                    defaultMessage: 'Start',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.transform.stepCreateForm.startTransformDescription', {
                    defaultMessage:
                      'Starts the transform. A transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. After the transform is started, you will be offered options to continue exploring the transform.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {isContinuousTransform(transformConfig) && created ? (
            <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
              <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
                <EuiButton
                  fill
                  isDisabled={loading}
                  onClick={setAlertFlyoutVisible.bind(null, true)}
                  data-test-subj="transformWizardCreateAlertButton"
                >
                  <FormattedMessage
                    id="xpack.transform.stepCreateForm.createAlertRuleButton"
                    defaultMessage="Create alert rule"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.transform.stepCreateForm.createAlertRuleDescription', {
                    defaultMessage:
                      'Opens a wizard to create an alert rule for monitoring transform health.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiButton
                isDisabled={loading || created}
                onClick={() => createTransformHandler()}
                data-test-subj="transformWizardCreateButton"
              >
                {i18n.translate('xpack.transform.stepCreateForm.createTransformButton', {
                  defaultMessage: 'Create',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.transform.stepCreateForm.createTransformDescription', {
                  defaultMessage:
                    'Creates the transform without starting it. You will be able to start the transform later by returning to the transforms list.',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiCopy textToCopy={getTransformConfigDevConsoleStatement()}>
                {(copy: () => void) => (
                  <EuiButton
                    onClick={copy}
                    style={{ width: '100%' }}
                    data-test-subj="transformWizardCopyToClipboardButton"
                  >
                    {i18n.translate(
                      'xpack.transform.stepCreateForm.copyTransformConfigToClipboardButton',
                      {
                        defaultMessage: 'Copy to clipboard',
                      }
                    )}
                  </EuiButton>
                )}
              </EuiCopy>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate(
                  'xpack.transform.stepCreateForm.copyTransformConfigToClipboardDescription',
                  {
                    defaultMessage:
                      'Copies to the clipboard the Kibana Dev Console command for creating the transform.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {progressPercentComplete !== undefined && isBatchTransform && (
            <>
              <EuiSpacer size="m" />
              <EuiText size="xs">
                <strong>
                  {i18n.translate('xpack.transform.stepCreateForm.progressTitle', {
                    defaultMessage: 'Progress',
                  })}
                </strong>
              </EuiText>
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem style={{ width: '400px' }} grow={false}>
                  <EuiProgress
                    size="l"
                    color="primary"
                    value={progressPercentComplete}
                    max={100}
                    data-test-subj="transformWizardProgressBar"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs">{progressPercentComplete}%</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
          {created && (
            <>
              <EuiHorizontalRule />
              <EuiFlexGroup gutterSize="l">
                <EuiFlexItem style={PANEL_ITEM_STYLE} grow={false}>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type="list" />}
                    title={i18n.translate('xpack.transform.stepCreateForm.transformListCardTitle', {
                      defaultMessage: 'Transforms',
                    })}
                    description={i18n.translate(
                      'xpack.transform.stepCreateForm.transformListCardDescription',
                      {
                        defaultMessage: 'Return to the transform management page.',
                      }
                    )}
                    onClick={() => setRedirectToTransformManagement(true)}
                    data-test-subj="transformWizardCardManagement"
                  />
                </EuiFlexItem>
                {started === true && createDataView === true && dataViewId === undefined && (
                  <EuiFlexItem style={PANEL_ITEM_STYLE} grow={false}>
                    <EuiPanel style={{ position: 'relative' }}>
                      <EuiProgress size="xs" color="primary" position="absolute" />
                      <EuiText color="subdued" size="s">
                        <p>
                          {i18n.translate(
                            'xpack.transform.stepCreateForm.creatingDataViewMessage',
                            {
                              defaultMessage: 'Creating Kibana data view ...',
                            }
                          )}
                        </p>
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                )}
                {isDiscoverAvailable && discoverLink !== undefined && (
                  <EuiFlexItem style={PANEL_ITEM_STYLE} grow={false}>
                    <EuiCard
                      icon={<EuiIcon size="xxl" type="discoverApp" />}
                      title={i18n.translate('xpack.transform.stepCreateForm.discoverCardTitle', {
                        defaultMessage: 'Discover',
                      })}
                      description={i18n.translate(
                        'xpack.transform.stepCreateForm.discoverCardDescription',
                        {
                          defaultMessage: 'Use Discover to explore the transform.',
                        }
                      )}
                      href={discoverLink}
                      data-test-subj="transformWizardCardDiscover"
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </>
          )}
        </EuiForm>
        {alertFlyoutVisible ? (
          <TransformAlertFlyout
            ruleParams={{ includeTransforms: [transformId] }}
            onCloseFlyout={setAlertFlyoutVisible.bind(null, false)}
          />
        ) : null}
      </div>
    );
  }
);
