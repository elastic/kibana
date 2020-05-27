/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { EuiCard, EuiIcon } from '@elastic/eui';
import { TagList } from '../tag_list/';

export interface Props {
  /**
   * name of the element
   */
  title: string;
  /**
   * description of the element
   */
  description: string;
  /**
   * preview image of the element
   */
  image?: string;
  /**
   * tags associated with the element
   */
  tags?: string[];
  /**
   * handler when clicking the card
   */
  onClick?: () => void;
}

const tagType = 'badge';

export const ElementCard = ({ title, description, image, tags = [], onClick, ...rest }: Props) => (
  <EuiCard
    className={image ? 'canvasElementCard' : 'canvasElementCard canvasElementCard--hasIcon'}
    textAlign="left"
    title={title}
    description={description}
    footer={<TagList tags={tags} tagType={tagType} />}
    image={image}
    icon={image ? undefined : <EuiIcon type="canvasApp" size="xxl" />}
    onClick={onClick}
    {...rest}
  />
);

ElementCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string,
  onClick: PropTypes.func,
};
