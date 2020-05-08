/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { EuiFlexItem, EuiFlexGrid } from '@elastic/eui';
import { ElementControls } from './element_controls';
import { CustomElement } from '../../../types';
import { ElementCard } from '../element_card';

export interface Props {
  /**
   * list of elements to generate cards for
   */
  elements: CustomElement[];
  /**
   * text to filter out cards
   */
  filterText: string;
  /**
   * handler invoked when clicking a card
   */
  onClick: (element: CustomElement) => void;
  /**
   * click handler for the edit button
   */
  onEdit: (element: CustomElement) => void;
  /**
   * click handler for the delete button
   */
  onDelete: (element: CustomElement) => void;
}

export const ElementGrid = ({ elements, filterText, onClick, onEdit, onDelete }: Props) => {
  filterText = filterText.toLowerCase();

  return (
    <EuiFlexGrid gutterSize="l" columns={4}>
      {map(elements, (element: CustomElement, index) => {
        const { name, displayName = '', help = '', image } = element;
        const whenClicked = () => onClick(element);

        if (
          filterText.length &&
          !name.toLowerCase().includes(filterText) &&
          !displayName.toLowerCase().includes(filterText) &&
          !help.toLowerCase().includes(filterText)
        ) {
          return null;
        }

        return (
          <EuiFlexItem key={index} className="canvasElementCard__wrapper">
            <ElementCard
              title={displayName || name}
              description={help}
              image={image}
              onClick={whenClicked}
            />
            <ElementControls onEdit={() => onEdit(element)} onDelete={() => onDelete(element)} />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGrid>
  );
};

ElementGrid.propTypes = {
  elements: PropTypes.array.isRequired,
  filterText: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

ElementGrid.defaultProps = {
  filterText: '',
};
