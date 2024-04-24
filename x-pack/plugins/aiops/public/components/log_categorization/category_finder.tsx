/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useMemo, useEffect } from 'react';

// import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitch, EuiTextArea, EuiSpacer } from '@elastic/eui';
import { type Category } from '@kbn/aiops-log-pattern-analysis/types';
import useDebounce from 'react-use/lib/useDebounce';
import { type EventRate } from './use_categorize_request';

interface Props {
  value: string | undefined;
  categories: Category[];
  eventRate: EventRate;
  loading: boolean;
  setFilterKey: (key: string | null) => void;
}

export const CategoryFinder: FC<Props> = ({
  value,
  categories,
  eventRate,
  loading,
  setFilterKey,
}) => {
  const [fieldValue, setFieldValue] = useState(value ?? '');
  const [enabled, setEnabled] = useState(value !== undefined);

  const [matchedCategory, setMatchedCategory] = useState<{
    regex: RegExp;
    key: string;
  } | null>(null);

  useEffect(() => {
    setFilterKey(enabled && matchedCategory ? matchedCategory?.key : null);
  }, [enabled, matchedCategory, setFilterKey]);

  const regexList = useMemo(
    () =>
      categories.map((c) => ({
        regex: new RegExp(c.regex),
        key: c.key,
      })),
    [categories]
  );

  useDebounce(
    () => {
      const category = regexList.find((r) => r.regex.test(fieldValue));
      if (category !== undefined) {
        setMatchedCategory(category);
        setFilterKey(category.key);
      } else {
        setMatchedCategory(null);
        setFilterKey(null);
      }
    },
    500,
    [fieldValue, regexList]
  );

  const onChange = (text: string) => {
    setFieldValue(text);
  };
  return (
    <>
      <EuiSwitch
        label="Filter for specific value"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
      />
      {enabled ? (
        <>
          <EuiSpacer size="s" />
          <EuiTextArea
            data-test-subj="aiopsCategoryFinderTextArea"
            fullWidth
            value={fieldValue}
            onChange={(e) => onChange(e.target.value)}
            style={{ height: '66px' }}
          />
          {/* {matchedCategory?.key} */}
        </>
      ) : null}
    </>
  );
};
