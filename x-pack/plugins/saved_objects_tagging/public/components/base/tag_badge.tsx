/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TagAttributes } from '../../../common/types';

export interface TagBadgeProps<T> {
  tag: T;
  onClick?: (tag: T) => void;
}

/**
 * The badge representation of a Tag, which is the default display to be used for them.
 */
export const TagBadge: <T extends TagAttributes>(props: TagBadgeProps<T>) => ReactElement = ({
  tag,
  onClick,
}) => {
  const onClickProps = onClick
    ? {
        onClick: () => {
          onClick!(tag);
        },
        onClickAriaLabel: i18n.translate('xpack.savedObjectsTagging.tagList.tagBadge.buttonLabel', {
          defaultMessage: '{tagName} tag button.',
          values: {
            tagName: tag.name,
          },
        }),
        iconOnClick: () => undefined,
        iconOnClickAriaLabel: '',
      }
    : {};

  return (
    <EuiBadge color={tag.color} title={tag.description} {...onClickProps}>
      {tag.name}
    </EuiBadge>
  );
};
