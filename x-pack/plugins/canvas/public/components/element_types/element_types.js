/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFieldSearch,
  EuiCard,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiModalHeader,
  EuiModalBody,
} from '@elastic/eui';
import lowerCase from 'lodash.lowercase';
import { map, includes, sortBy } from 'lodash';

export const ElementTypes = ({ elements, onClick, search, setSearch }) => {
  search = lowerCase(search);
  elements = sortBy(map(elements, (element, name) => ({ name, ...element })), 'displayName');
  const elementList = map(elements, (element, name) => {
    const { help, displayName, expression, filter, width, height, image } = element;
    const whenClicked = () => onClick({ expression, filter, width, height });

    // Add back in icon={image} to this when Design has a full icon set
    const card = (
      <EuiFlexItem key={name}>
        <EuiCard
          textAlign="left"
          image={image}
          title={displayName}
          description={help}
          onClick={whenClicked}
          className="canvasCard"
        />
      </EuiFlexItem>
    );

    if (!search) return card;
    if (includes(lowerCase(name), search)) return card;
    if (includes(lowerCase(displayName), search)) return card;
    if (includes(lowerCase(help), search)) return card;
    return null;
  });

  return (
    <Fragment>
      <EuiModalHeader>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFieldSearch
              className="canvasElements__filter"
              placeholder="Filter elements"
              onChange={e => setSearch(e.target.value)}
              value={search}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGrid gutterSize="l" columns={4}>
          {elementList}
        </EuiFlexGrid>
      </EuiModalBody>
    </Fragment>
  );
};

ElementTypes.propTypes = {
  elements: PropTypes.object,
  onClick: PropTypes.func,
  search: PropTypes.string,
  setSearch: PropTypes.func,
};
