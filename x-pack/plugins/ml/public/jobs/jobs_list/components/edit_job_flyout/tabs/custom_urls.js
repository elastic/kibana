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
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import { toastNotifications } from 'ui/notify';

import {
  CustomUrlEditor,
  CustomUrlList
} from 'plugins/ml/jobs/components/custom_url_editor';
import {
  getNewCustomUrlDefaults,
  getQueryEntityFieldNames,
  isValidCustomUrlSettings,
  buildCustomUrlFromSettings
} from 'plugins/ml/jobs/components/custom_url_editor/utils';
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

  render() {
    const {
      customUrls,
      editorOpen,
      editorSettings,
      dashboards,
      indexPatterns,
      queryEntityFieldNames,
    } = this.state;

    return (
      <React.Fragment>
        <EuiSpacer size="m" />
        <CustomUrlList
          job={this.props.job}
          customUrls={customUrls}
          setCustomUrls={this.setCustomUrls}
        />

        {editorOpen === false ? (
          <EuiButtonEmpty
            onClick={() => this.editNewCustomUrl()}
          >
            Add custom URL
          </EuiButtonEmpty>
        ) : (
          <React.Fragment>
            <EuiSpacer size="l" />
            <EuiPanel className="ml-custom-url-editor">
              <CustomUrlEditor
                customUrl={editorSettings}
                setEditCustomUrl={this.setEditCustomUrl}
                dashboards={dashboards}
                indexPatterns={indexPatterns}
                queryEntityFieldNames={queryEntityFieldNames}
              />
              <EuiSpacer size="m" />
              <EuiButton
                onClick={() => this.addNewCustomUrl()}
                isDisabled={!isValidCustomUrlSettings(editorSettings)}
              >
                Add
              </EuiButton>
            </EuiPanel>
          </React.Fragment>
        )}

      </React.Fragment>
    );
  }
}
CustomUrls.propTypes = {
  job: PropTypes.object.isRequired,
  jobCustomUrls: PropTypes.array.isRequired,
  setCustomUrls: PropTypes.func.isRequired,
};
