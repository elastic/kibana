/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import '../styles/main.less';

export class CustomUrls extends Component {
  constructor(props) {
    super(props);

    this.state = {
      job: {},
      customUrls: [],
    };

    this.setCustomUrls = props.setCustomUrls;
    this.angularApply = props.angularApply;
  }

  static getDerivedStateFromProps(props) {
    return {
      job: props.job,
      customUrls: props.jobCustomUrls,
    };
  }


  onCustomUrlsChange = (urls) => {
    this.setCustomUrls({ jobCustomUrls: urls });
  }

  render() {
    const {
    } = this.state;
    return (
      <React.Fragment>
        <div />
      </React.Fragment>
    );
  }
}
CustomUrls.propTypes = {
  job: PropTypes.object.isRequired,
  jobCustomUrls: PropTypes.array.isRequired,
  setCustomUrls: PropTypes.func.isRequired,
};
