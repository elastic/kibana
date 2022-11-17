/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EuiFieldSearch, EuiFlexItem } from '@elastic/eui';
import { SEARCH_FIRST_RULE_ANCHOR } from '../rules_table/guided_onboarding/rules_management_tour';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';

const SearchBarWrapper = styled(EuiFlexItem)`
  & .euiPopover,
  & .euiPopover__anchor {
    // This is needed to "cancel" styles passed down from EuiTourStep that
    // interfere with EuiFieldSearch and don't allow it to take the full width
    display: block;
  }
`;

interface RuleSearchFieldProps {
  initialValue?: string;
  onSearch: (value: string) => void;
}

export function RuleSearchField({ initialValue, onSearch }: RuleSearchFieldProps): JSX.Element {
  const [searchText, setSearchText] = useState(initialValue);
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value),
    [setSearchText]
  );

  useEffect(() => {
    setSearchText(initialValue);
  }, [initialValue]);

  return (
    <SearchBarWrapper grow>
      <EuiFieldSearch
        id={SEARCH_FIRST_RULE_ANCHOR}
        aria-label={i18n.SEARCH_RULES}
        fullWidth
        incremental={false}
        placeholder={i18n.SEARCH_PLACEHOLDER}
        value={searchText}
        onChange={handleChange}
        onSearch={onSearch}
        data-test-subj="ruleSearchField"
      />
    </SearchBarWrapper>
  );
}
