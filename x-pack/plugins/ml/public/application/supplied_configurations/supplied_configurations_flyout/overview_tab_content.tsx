/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import {
  usePermissionCheck,
  createPermissionFailureMessage,
} from '../../capabilities/check_capabilities';
import type { Module, RecognizeModuleResult } from '../../../../common/types/modules';
import { useEnabledFeatures } from '../../contexts/ml/serverless_context';
import { useMlKibana } from '../../contexts/kibana';
import type { TabIdType, KibanaAssetType } from './flyout';
import { TAB_IDS } from './flyout';
import { DataViewsTable } from './data_views_table';
import { isLogoObject } from '../supplied_configurations';

export const LABELS = {
  dashboard: (
    <FormattedMessage
      id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.dashboardLabel"
      defaultMessage="Dashboard"
    />
  ),
  jobs: (
    <FormattedMessage
      id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.jobsLabel"
      defaultMessage="Jobs"
    />
  ),
  search: (
    <FormattedMessage
      id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.searchLabel"
      defaultMessage="Search"
    />
  ),
  visualization: (
    <FormattedMessage
      id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.visualizationLabel"
      defaultMessage="Visualization"
    />
  ),
};

export type LabelId = keyof typeof LABELS;

const ListDescriptionItem = ({
  label,
  onClick,
  value,
}: {
  label?: LabelId;
  value: number | string;
  onClick?: () => void;
}) => (
  <>
    <EuiDescriptionListDescription>
      {label ? (
        <EuiButtonEmpty color={'text'} onClick={onClick}>
          {LABELS[label]}
        </EuiButtonEmpty>
      ) : (
        ''
      )}
      {label ? ' ' : ''}
      <EuiNotificationBadge size={label ? 's' : 'm'} color="subdued">
        {value}
      </EuiNotificationBadge>
    </EuiDescriptionListDescription>
    {label ? null : <EuiSpacer size="s" />}
  </>
);

interface Props {
  module: Module;
  setSelectedTabId: (tabId: TabIdType) => void;
  setSelectedKibanaSubTab: (kibanaSubTab: KibanaAssetType) => void;
}

export const OverviewTabContent: FC<Props> = ({
  module,
  setSelectedTabId,
  setSelectedKibanaSubTab,
}) => {
  const [runningDataRecognizer, setRunningDataRecognizer] = useState<boolean>(false);
  const [recognizerWasRun, setRecognizerWasRun] = useState<boolean>(false);
  const [matchingDataViews, setMatchingDataViews] = useState<RecognizeModuleResult>([]);
  const {
    services: {
      docLinks,
      mlServices: {
        mlApi: { recognizeModule },
      },
    },
  } = useMlKibana();
  const { euiTheme } = useEuiTheme();
  const logsConfigsUrl = docLinks.links.ml.logsAnomalyDetectionConfigs;
  const metricsConfigsUrl = docLinks.links.ml.metricsAnomalyDetectionConfigs;
  const canCreateJob = usePermissionCheck('canCreateJob');
  const { showLogsSuppliedConfigurationsInfo } = useEnabledFeatures();

  const runDataRecongizer = async () => {
    setRunningDataRecognizer(true);
    const result = await recognizeModule({ moduleId: module.id });

    setMatchingDataViews(result);
    setRunningDataRecognizer(false);
    setRecognizerWasRun(true);
  };

  const runRecognizerButton = (
    <span>
      <EuiButton
        fill
        isDisabled={runningDataRecognizer || canCreateJob === false}
        isLoading={runningDataRecognizer}
        color={'primary'}
        onClick={runDataRecongizer}
        size="s"
        data-test-subj="mlSuppliedConfigurationsFlyoutRunDataRecognizerButton"
      >
        <FormattedMessage
          id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.runDataRecognizerButtonLabel"
          defaultMessage="Run data recognizer"
        />
      </EuiButton>
    </span>
  );

  return (
    <EuiFlexGroup direction="column">
      {/* DESCRIPTION */}
      <EuiFlexItem css={{ padding: `0 ${euiTheme.size.m}` }}>
        <EuiText size="m">
          <p>{module.description}</p>
        </EuiText>
      </EuiFlexItem>

      {/* MAIN CONTENT */}
      <EuiFlexItem css={{ padding: `0 ${euiTheme.size.m}` }}>
        <EuiFlexGroup gutterSize="m">
          {/* COLUMN WITH ASSETS, TYPE, TAGS */}
          <EuiFlexItem grow={1}>
            <EuiDescriptionList rowGutterSize="s">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.assetsTitle"
                  defaultMessage="Assets"
                />
              </EuiDescriptionListTitle>
              <EuiSpacer size="s" />
              <ListDescriptionItem
                label="jobs"
                value={module.jobs.length}
                onClick={() => setSelectedTabId(TAB_IDS.JOBS)}
              />
              {module.kibana
                ? Object.keys(module.kibana).map((kibanaAsset) => {
                    return (
                      <ListDescriptionItem
                        label={kibanaAsset as LabelId}
                        onClick={() => {
                          setSelectedKibanaSubTab(kibanaAsset as KibanaAssetType);
                          setSelectedTabId(TAB_IDS.KIBANA);
                        }}
                        value={(module.kibana && module.kibana[kibanaAsset]?.length) ?? 0}
                      />
                    );
                  })
                : null}

              <EuiSpacer size="m" />
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.tagsTitle"
                  defaultMessage="Tags"
                />
              </EuiDescriptionListTitle>
              <EuiSpacer size="s" />

              {module.tags?.length ? (
                module.tags.map((tag) => <ListDescriptionItem value={tag} />)
              ) : (
                <ListDescriptionItem
                  value={i18n.translate(
                    'xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.noTagsLabel',
                    {
                      defaultMessage: 'No tags',
                    }
                  )}
                />
              )}

              <EuiSpacer size="m" />
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.typeTitle"
                  defaultMessage="Type"
                />
                <EuiSpacer size="s" />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>{module.type}</EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>

          {/* COLUMN WITH QUERY */}
          <EuiFlexItem grow={3}>
            {module.query !== undefined ? (
              <EuiFlexGroup direction="column" gutterSize="xl">
                <EuiFlexItem>
                  <EuiDescriptionList rowGutterSize="m">
                    <EuiDescriptionListTitle>
                      <FormattedMessage
                        id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.eligibleTitle"
                        defaultMessage="These jobs are available if data exists that match the following query:"
                      />
                    </EuiDescriptionListTitle>
                    <EuiSpacer size="m" />
                    <EuiDescriptionListDescription>
                      <EuiCodeBlock
                        language="json"
                        isCopyable
                        overflowHeight="500px"
                        data-test-subj="mlPreconfigJobsQueryBlock"
                      >
                        {JSON.stringify(module.query, null, 2)}
                      </EuiCodeBlock>
                      <EuiSpacer size="s" />
                    </EuiDescriptionListDescription>
                  </EuiDescriptionList>
                </EuiFlexItem>
                {module.query !== undefined ? (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="flexEnd">
                      <EuiFlexItem grow={false}>
                        <EuiText size={'xs'}>
                          <FormattedMessage
                            id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.dataRecognizerHelpButtonLabel"
                            defaultMessage="Check data views to determine which can be used to create jobs with this configuration."
                          />
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        {canCreateJob === false ? (
                          <EuiToolTip
                            position="top"
                            content={createPermissionFailureMessage('canCreateJob')}
                          >
                            {runRecognizerButton}
                          </EuiToolTip>
                        ) : (
                          runRecognizerButton
                        )}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ) : null}
                {recognizerWasRun ? (
                  <EuiFlexItem grow={false}>
                    <DataViewsTable
                      matchingDataViews={matchingDataViews}
                      moduleId={module.id}
                      jobsLength={module.jobs.length}
                    />
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            ) : (
              <EuiEmptyPrompt
                css={{ margin: `${euiTheme.size.s}` }}
                color="primary"
                iconType={isLogoObject(module.logo) ? module.logo?.icon : undefined}
                title={
                  <h2>
                    <FormattedMessage
                      id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.unableToUseModuleTitle"
                      defaultMessage="You cannot create these jobs here"
                    />
                  </h2>
                }
                body={
                  showLogsSuppliedConfigurationsInfo === true ? (
                    <p>
                      <FormattedMessage
                        id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.unableToUseModuleHelpMessage"
                        defaultMessage="These supplied configurations can be used in {appName}."
                        values={{ appName: module.type }}
                      />
                    </p>
                  ) : undefined
                }
                footer={
                  <>
                    <EuiTitle size="xxs">
                      <h3>
                        <FormattedMessage
                          id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.useInanotherAppTitle"
                          defaultMessage="Want to learn more?"
                        />
                      </h3>
                    </EuiTitle>
                    <EuiLink
                      href={module.type === 'Logs' ? logsConfigsUrl : metricsConfigsUrl}
                      target="_blank"
                    >
                      <FormattedMessage
                        id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.useInanotherAppLink"
                        defaultMessage="Refer to the docs for more information on how to use this supplied configuration in other apps"
                      />
                    </EuiLink>
                  </>
                }
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
