/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { TimeRange as EsQueryTimeRange } from '@kbn/es-query';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import { isDataFrameAnalyticsConfigs } from '@kbn/ml-data-frame-analytics-utils';
import type { DashboardService, DashboardItems } from '../../services/dashboard_service';
import type { MlKibanaReactContextValue } from '../../contexts/kibana';
import { CustomUrlEditor, CustomUrlList } from './custom_url_editor';
import {
  getNewCustomUrlDefaults,
  isValidCustomUrlSettings,
  buildCustomUrlFromSettings,
  getTestUrl,
  type CustomUrlSettings,
} from './custom_url_editor/utils';
import { loadDataViewListItems } from '../../jobs/jobs_list/components/edit_job_flyout/edit_utils';
import { openCustomUrlWindow } from '../../util/custom_url_utils';
import type { CustomUrlsWrapperProps } from './custom_urls_wrapper';

interface CustomUrlsState {
  customUrls: MlUrlConfig[];
  dashboards: DashboardItems;
  dataViewListItems: DataViewListItem[];
  editorOpen: boolean;
  editorSettings?: CustomUrlSettings;
  supportedFilterFields: string[];
}
interface CustomUrlsProps extends CustomUrlsWrapperProps {
  kibana: MlKibanaReactContextValue;
  currentTimeFilter?: EsQueryTimeRange;
  dashboardService: DashboardService;
  isPartialDFAJob?: boolean;
}

class CustomUrlsUI extends Component<CustomUrlsProps, CustomUrlsState> {
  constructor(props: CustomUrlsProps) {
    super(props);

    this.state = {
      customUrls: [],
      dashboards: [],
      dataViewListItems: [],
      editorOpen: false,
      supportedFilterFields: [],
    };
  }

  static getDerivedStateFromProps(props: CustomUrlsProps) {
    return {
      job: props.job,
      customUrls: props.jobCustomUrls,
    };
  }

  componentDidMount() {
    const { toasts } = this.props.kibana.services.notifications;
    const { dashboardService } = this.props;
    dashboardService
      .fetchDashboards()
      .then((dashboards) => {
        this.setState({ dashboards });
      })
      .catch((resp) => {
        // eslint-disable-next-line no-console
        console.error('Error loading list of dashboards:', resp);
        toasts.addDanger(
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.loadSavedDashboardsErrorNotificationMessage',
            {
              defaultMessage: 'An error occurred loading the list of saved Kibana dashboards',
            }
          )
        );
      });

    loadDataViewListItems()
      .then((dataViewListItems) => {
        this.setState({ dataViewListItems });
      })
      .catch((resp) => {
        // eslint-disable-next-line no-console
        console.error('Error loading list of dashboards:', resp);
        toasts.addDanger(
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.loadDataViewsErrorNotificationMessage',
            {
              defaultMessage: 'An error occurred loading the list of saved data views',
            }
          )
        );
      });
  }

  editNewCustomUrl = () => {
    // Opens the editor for configuring a new custom URL.
    this.setState((prevState) => {
      const { dashboards, dataViewListItems } = prevState;

      return {
        editorOpen: true,
        editorSettings: getNewCustomUrlDefaults(
          this.props.job,
          dashboards,
          dataViewListItems,
          this.props.isPartialDFAJob
        ),
      };
    });
  };

  setEditCustomUrl = (customUrl: CustomUrlSettings) => {
    this.setState({
      editorSettings: customUrl,
    });
  };

  addNewCustomUrl = () => {
    const { dashboard } = this.props.kibana.services;

    buildCustomUrlFromSettings(dashboard, this.state.editorSettings as CustomUrlSettings)
      .then((customUrl) => {
        const customUrls = [...this.state.customUrls, customUrl];
        this.props.setCustomUrls(customUrls);
        this.setState({ editorOpen: false });
      })
      .catch((error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Error building custom URL from settings:', error);
        const { toasts } = this.props.kibana.services.notifications;
        toasts.addDanger(
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.addNewUrlErrorNotificationMessage',
            {
              defaultMessage:
                'An error occurred building the new custom URL from the supplied settings',
            }
          )
        );
      });
  };

  onTestButtonClick = () => {
    const {
      http: { basePath },
      notifications: { toasts },
      data: { dataViews },
      dashboard,
    } = this.props.kibana.services;
    const dataViewId = this.state?.editorSettings?.kibanaSettings?.discoverIndexPatternId;
    const job = this.props.job;
    dataViews
      .get(dataViewId ?? '')
      .catch((error) => {
        // We still want to try to get the test URL as not all custom urls require a timefield to be passed.
        // eslint-disable-next-line no-console
        console.error('Error obtaining data view:', error);
      })
      .then((dataView) => {
        const timefieldName = dataView?.timeFieldName ?? null;
        buildCustomUrlFromSettings(dashboard, this.state.editorSettings as CustomUrlSettings).then(
          (customUrl) => {
            getTestUrl(
              job,
              customUrl,
              timefieldName,
              this.props.currentTimeFilter,
              this.props.isPartialDFAJob
            )
              .then((testUrl) => {
                openCustomUrlWindow(testUrl, customUrl, basePath.get());
              })
              .catch((resp) => {
                // eslint-disable-next-line no-console
                console.error('Error obtaining URL for test:', resp);
                toasts.addWarning(
                  i18n.translate(
                    'xpack.ml.jobsList.editJobFlyout.customUrls.getTestUrlErrorNotificationMessage',
                    {
                      defaultMessage:
                        'An error occurred obtaining the URL to test the configuration',
                    }
                  )
                );
              });
          }
        );
      })
      .catch((resp) => {
        // eslint-disable-next-line no-console
        console.error('Error building custom URL from settings:', resp);
        toasts.addWarning(
          i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.buildUrlErrorNotificationMessage',
            {
              defaultMessage:
                'An error occurred building the custom URL for testing from the supplied settings',
            }
          )
        );
      });
  };

  closeEditor = () => {
    this.setState({ editorOpen: false });
  };

  renderEditor() {
    const { customUrls, editorOpen, editorSettings, dashboards, dataViewListItems } = this.state;

    const editMode = this.props.editMode ?? 'inline';
    const editor = (
      <CustomUrlEditor
        showCustomTimeRangeSelector={
          isDataFrameAnalyticsConfigs(this.props.job) || this.props.isPartialDFAJob === true
        }
        customUrl={editorSettings}
        setEditCustomUrl={this.setEditCustomUrl}
        savedCustomUrls={customUrls}
        dashboards={dashboards}
        dataViewListItems={dataViewListItems}
        job={this.props.job}
        isPartialDFAJob={this.props.isPartialDFAJob}
      />
    );

    const isValidEditorSettings =
      editorOpen && editorSettings !== undefined
        ? isValidCustomUrlSettings(editorSettings, customUrls)
        : true;

    const addButton = (
      <EuiButton
        onClick={this.addNewCustomUrl}
        isDisabled={!isValidEditorSettings}
        data-test-subj="mlJobAddCustomUrl"
      >
        <FormattedMessage
          id="xpack.ml.jobsList.editJobFlyout.customUrls.addButtonLabel"
          defaultMessage="Add"
        />
      </EuiButton>
    );

    const testButton = (
      <EuiButtonEmpty
        iconType="popout"
        iconSide="right"
        onClick={this.onTestButtonClick}
        isDisabled={!isValidEditorSettings}
      >
        <FormattedMessage
          id="xpack.ml.jobsList.editJobFlyout.customUrls.testButtonLabel"
          defaultMessage="Test"
        />
      </EuiButtonEmpty>
    );

    return editMode === 'inline' ? (
      <EuiPanel className="edit-custom-url-panel">
        <EuiButtonIcon
          color="text"
          onClick={this.closeEditor}
          iconType="cross"
          aria-label={i18n.translate(
            'xpack.ml.jobsList.editJobFlyout.customUrls.closeEditorAriaLabel',
            {
              defaultMessage: 'Close custom URL editor',
            }
          )}
        />

        {editor}

        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>{addButton}</EuiFlexItem>
          <EuiFlexItem grow={false}>{testButton}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    ) : (
      <EuiModal
        onClose={this.closeEditor}
        initialFocus="[name=label]"
        style={{ width: 500 }}
        data-test-subj="mlJobNewCustomUrlFormModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.ml.jobsList.editJobFlyout.customUrls.addCustomUrlButtonLabel"
              defaultMessage="Add custom URL"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{editor}</EuiModalBody>

        <EuiModalFooter>
          {testButton}
          {addButton}
        </EuiModalFooter>
      </EuiModal>
    );
  }

  render() {
    const { customUrls, editorOpen } = this.state;
    const { editMode = 'inline' } = this.props;

    return (
      <>
        <EuiSpacer size="m" />
        {(!editorOpen || editMode === 'modal') && (
          <EuiButton
            size="s"
            onClick={this.editNewCustomUrl}
            data-test-subj="mlJobOpenCustomUrlFormButton"
          >
            <FormattedMessage
              id="xpack.ml.jobsList.editJobFlyout.customUrls.addCustomUrlButtonLabel"
              defaultMessage="Add custom URL"
            />
          </EuiButton>
        )}
        {editorOpen && this.renderEditor()}
        <EuiSpacer size="l" />
        <CustomUrlList
          job={this.props.job}
          customUrls={customUrls}
          onChange={this.props.setCustomUrls}
          dataViewListItems={this.state.dataViewListItems}
          isPartialDFAJob={this.props.isPartialDFAJob}
        />
      </>
    );
  }
}

export const CustomUrls = withKibana(CustomUrlsUI);
