/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { map, includes } from 'lodash';
// @ts-ignore no @types definition
import lowerCase from 'lodash.lowercase';
import { EuiFlexItem, EuiFlexGrid } from '@elastic/eui';
import { ElementControls } from './element_controls';
import { CustomElement } from '../../lib/custom_element';
import { ElementSpec } from '../../../canvas_plugin_src/elements/types';
import { ElementCard } from '../element_card';

export interface Props {
  /**
   * list of elements to generate cards for
   */
  elements: Array<ElementSpec | CustomElement>;
  /**
   * text filter to filter out cards
   */
  filter?: string;
  /**
   * handler invoked when clicking a card
   */
  handleClick: (element: ElementSpec | CustomElement) => void;
  /**
   * indicate whether or not edit/delete controls should be displayed
   */
  showControls?: boolean;
  /**
   * click handler for the edit button
   */
  onEdit?: (element: ElementSpec | CustomElement) => void;
  /**
   * click handler for the delete button
   */
  onDelete?: (element: ElementSpec | CustomElement) => void;
}

export const ElementGrid = ({
  elements,
  filter,
  handleClick,
  onEdit,
  onDelete,
  showControls,
}: Props) => {
  filter = lowerCase(filter);

  return (
    <EuiFlexGrid gutterSize="l" columns={4}>
      {map(elements, (element: ElementSpec | CustomElement, name) => {
        const { help, displayName, image } = element;
        const whenClicked = () => handleClick(element);

        const card = (
          <EuiFlexItem key={name} className="canvasElementCard__wrapper">
            <ElementCard
              title={displayName}
              description={help}
              image={image}
              onClick={whenClicked}
            />
            {showControls && onEdit && onDelete && (
              <ElementControls onEdit={() => onEdit(element)} onDelete={() => onDelete(element)} />
            )}
          </EuiFlexItem>
        );

        if (!filter) {
          return card;
        }
        if (includes(lowerCase(name), filter)) {
          return card;
        }
        if (includes(lowerCase(displayName), filter)) {
          return card;
        }
        if (includes(lowerCase(help), filter)) {
          return card;
        }
        return null;
      })}
    </EuiFlexGrid>
  );
};

ElementGrid.propTypes = {
  elements: PropTypes.array.isRequired,
  handleClick: PropTypes.func.isRequired,
  showControls: PropTypes.bool,
};

ElementGrid.defaultProps = {
  showControls: false,
};
