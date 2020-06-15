/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MapsAppView } from '.';
import { getMapsSavedObjectLoader } from '../../../bootstrap/services/gis_map_saved_object_loader';

export const LoadMapAndRender = class extends React.Component {
  state = {
    savedMap: null,
  };

  async componentDidMount() {
    const { savedMapId } = this.props.match.params;
    try {
      const savedMap = await getMapsSavedObjectLoader().get(savedMapId);
      this.setState({ savedMap });
    } catch (err) {
      // error handling
    }
  }

  render() {
    const { savedMap } = this.state;
    const currentPath = this.props.match.url;

    return savedMap ? <MapsAppView savedMap={savedMap} currentPath={currentPath} /> : null;
  }
};
