/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import chrome from 'ui/chrome';
import { SpaceCard } from './space_card';
import { stripSpaceUrlContext, addSpaceUrlContext } from '../../../common/spaces_url_parser';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { chunk } from 'lodash';

export class SpaceCards extends Component {
  render() {
    const maxSpacesPerRow = 3;
    const rows = chunk(this.props.spaces, maxSpacesPerRow);

    return (
      <Fragment>
        {
          rows.map((row, idx) => (
            <Fragment key={idx}>
              <EuiFlexGroup gutterSize="l" justifyContent="spaceEvenly">
                {row.map(this.renderSpace)}
              </EuiFlexGroup>
              <EuiSpacer />
            </Fragment>
          ))
        }
      </Fragment>

    );
  }

  renderSpace = (space) => (
    <EuiFlexItem key={space.id} grow={false}>
      <SpaceCard space={space} onClick={this.createSpaceClickHandler(space)} />
    </EuiFlexItem>
  );

  createSpaceClickHandler = (space) => {
    return () => {
      const baseUrlWithoutSpace = stripSpaceUrlContext(chrome.getBasePath());

      window.location = addSpaceUrlContext(baseUrlWithoutSpace, space.urlContext);
    };
  };
}

SpaceCards.propTypes = {
  spaces: PropTypes.array.isRequired,
};
