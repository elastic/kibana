/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

export const filterInValueButtonLabel = i18n.translate(
  'xpack.observability.hoverActions.filterInValueButtonLabel',
  {
    defaultMessage: 'Filter In',
  }
);

export const filterOutValueButtonLabel = i18n.translate(
  'xpack.observability.hoverActions.filterOutValueButtonLabel',
  {
    defaultMessage: 'Filter Out',
  }
);

import { EuiButtonIcon, EuiButtonEmpty } from '@elastic/eui';

interface FilterForValueProps {
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  field: string;
  value: string[] | string | null | undefined;
  addToQuery: (value: string) => void;
  exclude?: boolean;
}

const FilterForValueButton: React.FC<FilterForValueProps> = React.memo(
  ({ Component, field, value, addToQuery, exclude = false }) => {
    const text = useMemo(
      () => `${exclude ? 'not ' : ''}${field}${value != null ? `: "${value}"` : ''}`,
      [field, value, exclude]
    );
    const onClick = useCallback(() => {
      addToQuery(text);
    }, [text, addToQuery]);
    const label = exclude ? filterOutValueButtonLabel : filterInValueButtonLabel;
    const iconType = exclude ? 'minusInCircle' : 'plusInCircle';
    const button = useMemo(
      () =>
        Component ? (
          <Component
            aria-label={label}
            data-test-subj="filter-for-value"
            iconType={iconType}
            onClick={onClick}
            title={label}
          >
            {label}
          </Component>
        ) : (
          <EuiButtonIcon
            aria-label={label}
            className="timelines__hoverActionButton"
            data-test-subj="filter-for-value"
            iconSize="s"
            iconType={iconType}
            onClick={onClick}
          />
        ),
      [Component, onClick, label, iconType]
    );
    return button;
  }
);

FilterForValueButton.displayName = 'FilterForValueButton';

// eslint-disable-next-line import/no-default-export
export { FilterForValueButton as default };
