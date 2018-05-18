/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import PropTypes from 'prop-types';

import { DetailDrawer } from '../detail_drawer';

//import { renderSection } from './statement_section';
import { StatementSection } from './statement_list';

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

    console.log(queue);
    return (
      <div>
        <StatementSection
          iconType="logstashInput"
          headingText="Inputs"
          statements={inputs}
        />
        Queue goes here
        <StatementSection
          iconType="logstashFilter"
          headingText="Filters"
          statements={filters}
        />
        <StatementSection
          iconType="logstashOutput"
          headingText="Outputs"
          statements={outputs}
        />
        { this.renderDetailDrawer() }
      </div>
    );
  }
}

ConfigViewer.propTypes = {
  inputs: PropTypes.array,
  filters: PropTypes.array,
  outputs: PropTypes.array,
  queue: PropTypes.object,
};