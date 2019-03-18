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
  EuiTabs,
  EuiTab
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

class SearchProfilerTabs extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.handleClick('search');
  }

  hasData() {
    const { profileResponse } = this.props;
    return !!profileResponse &&
      profileResponse.length > 0;
  }

  hasSearch() {
    const { profileResponse } = this.props;
    return this.hasData() &&
      profileResponse[0].searches != null &&
      profileResponse[0].searches.length > 0;
  }

  hasAggregations() {
    const { profileResponse } = this.props;
    return this.hasData() &&
    profileResponse[0].aggregations != null &&
    profileResponse[0].aggregations.length > 0;
  }

  handleClick(tabName) {
    const { activateTab } = this.props;
    activateTab(tabName);
  }

  render() {
    const { activeTab } = this.props;

    if (!this.hasData()) {
      return null;
    }

    return (
      <div>
        <EuiTabs size="s">
          <EuiTab
            isSelected={activeTab.search}
            disabled={!this.hasSearch()}
            onClick={() => this.handleClick('search')}
          >
            <FormattedMessage
              id="xpack.searchProfiler.queryProfileTabTitle"
              defaultMessage="Query Profile"
            />
          </EuiTab>
          <EuiTab
            isSelected={activeTab.aggregations}
            disabled={!this.hasAggregations()}
            onClick={() => this.handleClick('aggregations')}
          >
            <FormattedMessage
              id="tsvb.gauge.optionsTab.panelOptionsButtonLabel"
              defaultMessage="Panel options"
            />
          </EuiTab>
        </EuiTabs>
      </div>
    );
  }
}

SearchProfilerTabs.propTypes = {
  activeTab: PropTypes.any.isRequired,
  activateTab: PropTypes.func.isRequired,
  profileResponse: PropTypes.array.isRequired,
};

export { SearchProfilerTabs };
