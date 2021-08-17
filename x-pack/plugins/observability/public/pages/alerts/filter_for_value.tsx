/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

export const FILTER_FOR_VALUE = i18n.translate('xpack.observability.hoverActions.filterForValue', {
  defaultMessage: 'Filter for value',
});

import { EuiButtonIcon, EuiButtonEmpty } from '@elastic/eui';

interface FilterForValueProps {
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  field: string;
  value: string[] | string | null | undefined;
  addToQuery: (value: string) => void;
}

const FilterForValueButton: React.FC<FilterForValueProps> = React.memo(
  ({ Component, field, value, addToQuery }) => {
    const text = useMemo(() => `${field}${value != null ? `: "${value}"` : ''}`, [field, value]);
    const onClick = useCallback(() => {
      addToQuery(text);
    }, [text, addToQuery]);
    const button = useMemo(
      () =>
        Component ? (
          <Component
            aria-label={FILTER_FOR_VALUE}
            data-test-subj="filter-for-value"
            iconType="plusInCircle"
            onClick={onClick}
            title={FILTER_FOR_VALUE}
          >
            {FILTER_FOR_VALUE}
          </Component>
        ) : (
          <EuiButtonIcon
            aria-label={FILTER_FOR_VALUE}
            className="timelines__hoverActionButton"
            data-test-subj="filter-for-value"
            iconSize="s"
            iconType="plusInCircle"
            onClick={onClick}
          />
        ),
      [Component, onClick]
    );
    return button;
  }
);

FilterForValueButton.displayName = 'FilterForValueButton';

// eslint-disable-next-line import/no-default-export
export { FilterForValueButton as default };
