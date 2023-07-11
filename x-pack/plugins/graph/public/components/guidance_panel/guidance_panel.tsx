/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiLink,
  EuiCallOut,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n-react';
import { connect } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IUnifiedSearchPluginServices } from '@kbn/unified-search-plugin/public/types';
import {
  GraphState,
  hasDatasourceSelector,
  hasFieldsSelector,
  requestDatasource,
  fillWorkspace,
} from '../../state_management';
import { IndexPatternSavedObject } from '../../types';
import { openSourceModal } from '../../services/source_modal';

export interface GuidancePanelProps {
  onFillWorkspace: () => void;
  onOpenFieldPicker: () => void;
  hasDatasource: boolean;
  hasFields: boolean;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
}

function ListItem({
  children,
  state,
}: {
  state: 'done' | 'active' | 'disabled';
  children: ReactNode;
}) {
  return (
    // eslint-disable-next-line jsx-a11y/role-supports-aria-props
    <li
      className={classNames('gphGuidancePanel__item', {
        'gphGuidancePanel__item--disabled': state === 'disabled',
      })}
      aria-disabled={state === 'disabled'}
      aria-current={state === 'active' ? 'step' : undefined}
    >
      {state !== 'disabled' && (
        <span
          className={classNames('gphGuidancePanel__itemIcon', {
            'gphGuidancePanel__itemIcon--done': state === 'done',
          })}
          aria-hidden={true}
        >
          <EuiIcon type={state === 'active' ? 'sortRight' : 'check'} />
        </span>
      )}
      <EuiText>{children}</EuiText>
    </li>
  );
}

function GuidancePanelComponent(props: GuidancePanelProps) {
  const { onFillWorkspace, onOpenFieldPicker, onIndexPatternSelected, hasDatasource, hasFields } =
    props;

  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { services, overlays } = kibana;
  const { http, uiSettings, application, data, savedObjectsManagement } = services;
  const [hasDataViews, setHasDataViews] = useState<boolean>(true);

  useEffect(() => {
    const checkIfDataViewsExist = async () => {
      setHasDataViews(await data.dataViews.hasData.hasUserDataView());
    };
    checkIfDataViewsExist();
  }, [setHasDataViews, data.dataViews]);

  if (!overlays || !application) return null;

  const onOpenDatasourcePicker = () => {
    openSourceModal({ overlays, http, uiSettings, savedObjectsManagement }, onIndexPatternSelected);
  };

  let content = (
    <EuiPanel data-test-subj="graphGuidancePanel">
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="graphApp" size="xxl" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <h1 id="graphHeading">
              {i18n.translate('xpack.graph.guidancePanel.title', {
                defaultMessage: 'Three steps to your graph',
              })}
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ol className="gphGuidancePanel__list" aria-labelledby="graphHeading">
            <ListItem state={hasDatasource ? 'done' : 'active'}>
              <EuiLink onClick={onOpenDatasourcePicker}>
                {i18n.translate(
                  'xpack.graph.guidancePanel.datasourceItem.indexPatternButtonLabel',
                  {
                    defaultMessage: 'Select a data source.',
                  }
                )}
              </EuiLink>
            </ListItem>
            <ListItem state={hasFields ? 'done' : hasDatasource ? 'active' : 'disabled'}>
              <EuiLink onClick={onOpenFieldPicker} disabled={!hasFields && !hasDatasource}>
                {i18n.translate('xpack.graph.guidancePanel.fieldsItem.fieldsButtonLabel', {
                  defaultMessage: 'Add fields.',
                })}
              </EuiLink>
            </ListItem>
            <ListItem state={hasFields ? 'active' : 'disabled'}>
              <FormattedMessage
                id="xpack.graph.guidancePanel.nodesItem.description"
                defaultMessage="Enter a query in the search bar to start exploring. Don't know where to start? {topTerms}."
                values={{
                  topTerms: (
                    <EuiLink onClick={onFillWorkspace} disabled={!hasFields}>
                      {i18n.translate('xpack.graph.guidancePanel.nodesItem.topTermsButtonLabel', {
                        defaultMessage: 'Graph the top terms',
                      })}
                    </EuiLink>
                  ),
                }}
              />
            </ListItem>
          </ol>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  if (!hasDataViews) {
    const dataViewManagementUrl = application.getUrlForApp('management', {
      path: '/kibana/dataViews',
    });
    const sampleDataUrl = `${application.getUrlForApp('home')}#/tutorial_directory/sampleData`;
    content = (
      <EuiPanel paddingSize="none">
        <EuiCallOut
          color="warning"
          iconType="help"
          title={i18n.translate('xpack.graph.noDataSourceNotificationMessageTitle', {
            defaultMessage: 'No data source',
          })}
          heading="h1"
        >
          <EuiScreenReaderOnly>
            <p id="graphHeading">
              {i18n.translate('xpack.graph.noDataSourceNotificationMessageTitle', {
                defaultMessage: 'No data source',
              })}
            </p>
          </EuiScreenReaderOnly>
          <p>
            <FormattedMessage
              id="xpack.graph.noDataSourceNotificationMessageText"
              defaultMessage="No data sources found. Go to {managementIndexPatternsLink} and create a data view for your Elasticsearch indices."
              values={{
                managementIndexPatternsLink: (
                  <a href={dataViewManagementUrl}>
                    <FormattedMessage
                      id="xpack.graph.noDataSourceNotificationMessageText.managementDataViewLinkText"
                      defaultMessage="Management &gt; Data views"
                    />
                  </a>
                ),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.graph.listing.noDataSource.newToKibanaDescription"
              defaultMessage="New to Kibana? You can also use our {sampleDataInstallLink}."
              values={{
                sampleDataInstallLink: (
                  <EuiLink href={sampleDataUrl}>
                    <FormattedMessage
                      id="xpack.graph.listing.noDataSource.sampleDataInstallLinkText"
                      defaultMessage="sample data"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem className="gphGuidancePanel">{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const GuidancePanel = connect(
  (state: GraphState) => {
    return {
      hasDatasource: hasDatasourceSelector(state),
      hasFields: hasFieldsSelector(state),
    };
  },
  (dispatch) => ({
    onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => {
      dispatch(
        requestDatasource({
          type: 'indexpattern',
          id: indexPattern.id,
          title: indexPattern.attributes.title,
        })
      );
    },
    onFillWorkspace: () => {
      dispatch(fillWorkspace());
    },
  })
)(GuidancePanelComponent);
