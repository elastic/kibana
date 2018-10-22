/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import { toastNotifications } from 'ui/notify';

import {
  CustomUrlEditor,
  CustomUrlList,
} from '../../../../components/custom_url_editor';
import {
  getNewCustomUrlDefaults,
  getQueryEntityFieldNames,
  isValidCustomUrlSettings,
  buildCustomUrlFromSettings,
  getTestUrl,
} from '../../../../components/custom_url_editor/utils';
import {
  loadSavedDashboards,
  loadIndexPatterns,
} from '../edit_utils';

import '../styles/main.less';

const MAX_NUMBER_DASHBOARDS = 1000;
const MAX_NUMBER_INDEX_PATTERNS = 1000;

export class CustomUrls extends Component {
  constructor(props) {
    super(props);

    this.state = {
      customUrls: [],
      dashboards: [],
      indexPatterns: [],
      queryEntityFieldNames: [],
      editorOpen: false,
    };

    this.setCustomUrls = props.setCustomUrls;
    this.angularApply = props.angularApply;
  }

  static getDerivedStateFromProps(props) {
    return {
      job: props.job,
      customUrls: props.jobCustomUrls,
      queryEntityFieldNames: getQueryEntityFieldNames(props.job),
    };
  }

  componentDidMount() {
    loadSavedDashboards(MAX_NUMBER_DASHBOARDS)
      .then((dashboards)=> {
        this.setState({ dashboards });
      })
      .catch((resp) => {
        console.log('Error loading list of dashboards:', resp);
        toastNotifications.addDanger('An error occurred loading the list of saved Kibana dashboards');
      });

    loadIndexPatterns(MAX_NUMBER_INDEX_PATTERNS)
      .then((indexPatterns) => {
        this.setState({ indexPatterns });
      })
      .catch((resp) => {
        console.log('Error loading list of dashboards:', resp);
        toastNotifications.addDanger('An error occurred loading the list of saved index patterns');
      });
  }

  editNewCustomUrl = () => {
    // Opens the editor for configuring a new custom URL.
    this.setState((prevState) => {
      const { dashboards, indexPatterns } = prevState;

      return {
        editorOpen: true,
        editorSettings: getNewCustomUrlDefaults(this.props.job, dashboards, indexPatterns)
      };
    });
  }

  setEditCustomUrl = (customUrl) => {
    this.setState({
      editorSettings: customUrl
    });
  }

  addNewCustomUrl = () => {
    buildCustomUrlFromSettings(this.state.editorSettings, this.props.job)
      .then((customUrl) => {
        const customUrls = [...this.state.customUrls, customUrl];
        this.setCustomUrls(customUrls);
        this.setState({ editorOpen: false });
      })
      .catch((resp) => {
        console.log('Error building custom URL from settings:', resp);
        toastNotifications.addDanger('An error occurred building the new custom URL from the supplied settings');
      });
  }

  onTestButtonClick = () => {
    const job = this.props.job;
    buildCustomUrlFromSettings(this.state.editorSettings, job)
      .then((customUrl) => {
        getTestUrl(job, customUrl)
          .then((testUrl) => {
            window.open(testUrl, '_blank');
          })
          .catch((resp) => {
            console.log('Error obtaining URL for test:', resp);
            toastNotifications.addWarning('An error occurred obtaining the URL to test the configuration');
          });
      })
      .catch((resp) => {
        console.log('Error building custom URL from settings:', resp);
        toastNotifications.addWarning('An error occurred building the custom URL for testing from the supplied settings');
      });
  }

  closeEditor = () => {
    this.setState({ editorOpen: false });
  }

  render() {
    const {
      customUrls,
      editorOpen,
      editorSettings,
      dashboards,
      indexPatterns,
      queryEntityFieldNames,
    } = this.state;

    const isValidEditorSettings = (editorOpen === true) ?
      isValidCustomUrlSettings(editorSettings, customUrls) : true;

    return (
      <React.Fragment>
        <EuiSpacer size="m" />
        {editorOpen === false ? (
          <React.Fragment>
            <EuiButton
              size="s"
              onClick={() => this.editNewCustomUrl()}
            >
              Add custom URL
            </EuiButton>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <EuiPanel className="edit-custom-url-panel">
              <EuiButtonIcon
                color="text"
                onClick={() => this.closeEditor()}
                iconType="cross"
                aria-label="Close custom URL editor"
                className="close-editor-button"
              />
              <CustomUrlEditor
                customUrl={editorSettings}
                setEditCustomUrl={this.setEditCustomUrl}
                savedCustomUrls={customUrls}
                dashboards={dashboards}
                indexPatterns={indexPatterns}
                queryEntityFieldNames={queryEntityFieldNames}
              />
              <EuiSpacer size="m" />
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => this.addNewCustomUrl()}
                    isDisabled={!isValidEditorSettings}
                  >
                    Add
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="popout"
                    iconSide="right"
                    onClick={() => this.onTestButtonClick()}
                    isDisabled={!isValidEditorSettings}
                  >
                    Test
                  </EuiButtonEmpty>
                </EuiFlexItem>

              </EuiFlexGroup>
            </EuiPanel>
          </React.Fragment>
        )}
        <EuiSpacer size="l" />
        <CustomUrlList
          job={this.props.job}
          customUrls={customUrls}
          setCustomUrls={this.setCustomUrls}
        />

      </React.Fragment>
    );
  }
}
CustomUrls.propTypes = {
  job: PropTypes.object.isRequired,
  jobCustomUrls: PropTypes.array.isRequired,
  setCustomUrls: PropTypes.func.isRequired,
};
