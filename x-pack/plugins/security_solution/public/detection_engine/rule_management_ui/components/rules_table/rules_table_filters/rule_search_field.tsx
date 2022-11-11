import React, { ChangeEvent, useCallback, useState } from 'react';
import styled from 'styled-components';
import { EuiFieldSearch, EuiFlexItem } from '@elastic/eui';
import { SEARCH_FIRST_RULE_ANCHOR } from '../../guided_onboarding/rules_management_tour';
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
  initialValue: string;
  onSearch: (value: string) => void;
}

export function RuleSearchField({ initialValue, onSearch }: RuleSearchFieldProps): JSX.Element {
  const [searchText, setSearchText] = useState(initialValue);
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value),
    [setSearchText]
  );

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
      />
    </SearchBarWrapper>
  );
}
