/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { DetailDrawer } from '../detail_drawer';
import { Queue } from './queue';
import { StatementSection } from './statement_section';
import {
  EuiSpacer,
  EuiPage,
  EuiPageContent,
} from '@elastic/eui';

export class ConfigViewer extends React.Component {
  constructor() {
    super();
    this.state = {
      detailDrawer: {
        vertex: null
      }
    };
  }

  onShowVertexDetails = (vertex) => {
    if (vertex === this.state.detailDrawer.vertex) {
      this.onHideVertexDetails();
    }
    else {
      this.setState({
        detailDrawer: {
          vertex
        }
      });
    }
  }

  onHideVertexDetails = () => {
    this.setState({
      detailDrawer: {
        vertex: null
      }
    });
  }

  renderDetailDrawer = () => {
    if (!this.state.detailDrawer.vertex) {
      return null;
    }

    return (
      <DetailDrawer
        vertex={this.state.detailDrawer.vertex}
        onHide={this.onHideVertexDetails}
        timeseriesTooltipXValueFormatter={this.props.timeseriesTooltipXValueFormatter}
      />
    );
  }

  render() {
    const {
      inputs,
      filters,
      outputs,
      queue
    } = this.props.pipeline;

    return (
      <EuiPage>
        <EuiPageContent verticalPosition="center" horizontalPosition="center" className="configViewer">
          <StatementSection
            iconType="logstashInput"
            headingText="Inputs"
            elements={inputs}
            onShowVertexDetails={this.onShowVertexDetails}
            detailVertex={this.state.detailDrawer.vertex}
          />
          <EuiSpacer />
          <Queue queue={queue} />
          <EuiSpacer />
          <StatementSection
            iconType="logstashFilter"
            headingText="Filters"
            elements={filters}
            onShowVertexDetails={this.onShowVertexDetails}
            detailVertex={this.state.detailDrawer.vertex}
          />
          <EuiSpacer />
          <StatementSection
            iconType="logstashOutput"
            headingText="Outputs"
            elements={outputs}
            onShowVertexDetails={this.onShowVertexDetails}
            detailVertex={this.state.detailDrawer.vertex}
          />
          { this.renderDetailDrawer() }
        </EuiPageContent>
      </EuiPage>
    );
  }
}

ConfigViewer.propTypes = {
  pipeline: PropTypes.shape({
    inputs: PropTypes.array.isRequired,
    filters: PropTypes.array.isRequired,
    outputs: PropTypes.array.isRequired,
    queue: PropTypes.object.isRequired,
  }).isRequired
};
