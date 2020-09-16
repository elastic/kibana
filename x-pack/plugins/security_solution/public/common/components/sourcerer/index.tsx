/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiIcon,
  EuiIconTip,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import debounce from 'lodash/debounce';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import * as i18n from './translations';
import { SOURCERER_FEATURE_FLAG_ON } from '../../containers/sourcerer/constants';
import { ADD_INDEX_PATH } from '../../../../common/constants';
import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import { State } from '../../store';
import { getSourcererScopeSelector, SourcererScopeSelector } from './selectors';

interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
}

const toggleFilter = [
  {
    id: 'all',
    label: <>{i18n.ALL_DEFAULT}</>,
  },
  {
    id: 'kibana',
    label: (
      <>
        <EuiIcon type="logoKibana" size="s" /> {i18n.SOURCERER}
      </>
    ),
  },
];

export const SourcererComponent = React.memo<SourcererComponentProps>(({ scope: scopeId }) => {
  const dispatch = useDispatch();
  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { configIndexPatterns, kibanaIndexPatterns, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, scopeId), deepEqual);
  const [filter, setFilter] = useState('all');
  const { selectedPatterns, loading } = sourcererScope;
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const setPopoverIsOpenCb = useCallback(() => setPopoverIsOpen((prevState) => !prevState), []);

  const onChangeIndexPattern = useCallback(
    (newSelectedPatterns: string[]) => {
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: scopeId,
          selectedPatterns: newSelectedPatterns,
        })
      );
    },
    [dispatch, scopeId]
  );

  const renderOption = useCallback(
    (option) => {
      const { value } = option;
      if (kibanaIndexPatterns.some((kip) => kip.title === value)) {
        return (
          <>
            <EuiIcon type="logoKibana" size="s" /> {value}
          </>
        );
      }
      return <>{value}</>;
    },
    [kibanaIndexPatterns]
  );

  const onChangeCombo = useCallback(
    (newSelectedOptions) => {
      setFilter('custom');
      onChangeIndexPattern(newSelectedOptions.map((so: { value: string }) => so.value));
    },
    [onChangeIndexPattern]
  );

  const onChangeFilter = useCallback(
    (newFilter) => {
      setFilter(newFilter);
      if (newFilter === 'all') {
        onChangeIndexPattern(configIndexPatterns);
      } else if (newFilter === 'kibana') {
        onChangeIndexPattern(kibanaIndexPatterns.map((kip) => kip.title));
      }
    },
    [configIndexPatterns, kibanaIndexPatterns, onChangeIndexPattern]
  );

  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    return selectedPatterns.map((indexSelected) => ({
      label: indexSelected,
      value: indexSelected,
    }));
  }, [selectedPatterns]);

  const indexesPatternOptions = useMemo(
    () =>
      [...configIndexPatterns, ...kibanaIndexPatterns.map((kip) => kip.title)].reduce<
        Array<EuiComboBoxOptionOption<string>>
      >((acc, index) => {
        if (index != null && !acc.some((o) => o.label.includes(index))) {
          return [...acc, { label: index, value: index }];
        }
        return acc;
      }, []),
    [configIndexPatterns, kibanaIndexPatterns]
  );

  const trigger = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={i18n.SOURCERER}
        data-test-subj="sourcerer-trigger"
        flush="left"
        iconSide="right"
        iconType="indexSettings"
        isLoading={loading}
        onClick={setPopoverIsOpenCb}
        size="l"
        title={i18n.SOURCERER}
      >
        {i18n.SOURCERER}
      </EuiButtonEmpty>
    ),
    [setPopoverIsOpenCb, loading]
  );

  const indexesfilter = useMemo(
    () => (
      <EuiButtonGroup
        options={toggleFilter}
        idSelected={filter}
        onChange={onChangeFilter}
        buttonSize="compressed"
        isFullWidth
      />
    ),
    [filter, onChangeFilter]
  );

  const comboBox = useMemo(
    () => (
      <EuiComboBox
        placeholder="Pick index patterns"
        fullWidth
        options={indexesPatternOptions}
        selectedOptions={selectedOptions}
        onChange={debounce(onChangeCombo, 600, {
          leading: true,
          trailing: false,
        })}
        renderOption={renderOption}
      />
    ),
    [indexesPatternOptions, onChangeCombo, renderOption, selectedOptions]
  );

  return (
    <EuiToolTip position="top" content={sourcererScope.selectedPatterns.sort().join(', ')}>
      <EuiPopover
        button={trigger}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        display="block"
        panelPaddingSize="s"
        ownFocus
      >
        <div style={{ width: 600 }}>
          <EuiPopoverTitle>
            <>
              {i18n.CHANGE_INDEX_PATTERNS}
              <EuiIconTip position="right" content={i18n.CONFIGURE_INDEX_PATTERNS} />
            </>
          </EuiPopoverTitle>
          {indexesfilter}
          <EuiSpacer size="s" />
          {comboBox}
          <EuiPopoverFooter>
            <EuiButton data-test-subj="add-index" href={ADD_INDEX_PATH} fullWidth size="s">
              {i18n.ADD_INDEX_PATTERNS}
            </EuiButton>
          </EuiPopoverFooter>
        </div>
      </EuiPopover>
    </EuiToolTip>
  );
});
SourcererComponent.displayName = 'Sourcerer';

export const Sourcerer = SOURCERER_FEATURE_FLAG_ON ? SourcererComponent : () => null;
