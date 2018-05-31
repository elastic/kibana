/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ColaGraph } from './views/cola_graph';
import { DetailDrawer } from './views/detail_drawer';
import { PropTypes } from 'prop-types';

export class PipelineViewer extends React.Component {
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
    const graph = this.props.pipelineState.config.graph;

    return (
      <div className="lspvContainer">
        <ColaGraph
          graph={graph}
          onShowVertexDetails={this.onShowVertexDetails}
          detailVertex={this.state.detailDrawer.vertex}
        />
        { this.renderDetailDrawer() }
      </div>
    );
  }
}

PipelineViewer.propTypes = {
  pipelineState: PropTypes.shape({
    config: PropTypes.shape({
      graph: PropTypes.object.isRequired
    })
  }),
  timeseriesTooltipXValueFormatter: PropTypes.func.isRequired
};
