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
  EuiSpacer
} from '@elastic/eui';

import { mlJobService } from 'plugins/ml/services/job_service';
import { checkPermission } from 'plugins/ml/privilege/check_privilege';
import { ML_DATA_PREVIEW_COUNT } from 'plugins/ml/../common/util/job_utils';
import { MLJobEditor } from '../ml_job_editor';

export class DatafeedPreviewPane extends Component {

  constructor(props) {
    super(props);

    this.state = {
      previewJson: ''
    };
  }

  componentDidMount() {
    updateDatafeedPreview(this.props.job)
      .then((previewJson) => {
        this.setState({ previewJson });
      })
      .catch((error) => {
        console.log('Datafeed preview could not be loaded', error);
      });
  }

  render() {
    return (
      <React.Fragment>
        <EuiSpacer size="s" />
        <MLJobEditor value={this.state.previewJson} readOnly={true} />
      </React.Fragment>
    );
  }
}
DatafeedPreviewPane.propTypes = {
  job: PropTypes.object.isRequired,
};

function updateDatafeedPreview(job) {
  return new Promise((resolve, reject) => {
    const canPreviewDatafeed = checkPermission('canPreviewDatafeed');
    if (canPreviewDatafeed) {
      mlJobService.getDatafeedPreview(job.job_id)
        .then((resp) => {
          if (Array.isArray(resp)) {
            resolve(JSON.stringify(resp.slice(0, ML_DATA_PREVIEW_COUNT), null, 2));
          } else {
            resolve('');
            console.log('Datafeed preview could not be loaded', resp);
          }
        })
        .catch((error) => {
          reject(error);
        });
    }
  });
}
