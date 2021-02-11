/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import * as i18n from './translations';
import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import { State } from '../../store';
import { getSourcererScopeSelector, SourcererScopeSelector } from './selectors';
import {
  SelectablePatterns,
  SourcererPatternType,
} from '../../../../common/search_strategy/index_fields';
import { filterKipAsSoloPattern, getPatternColor, renderPatternOption } from './helpers';
import { ColorKey } from './color_key';

const PopoverContent = styled.div`
  width: 600px;
`;

const ResetButton = styled(EuiButtonEmpty)`
  width: fit-content;
`;
interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
}
type ComboBoxOptions = Array<EuiComboBoxOptionOption<string>>;
export const Sourcerer = React.memo<SourcererComponentProps>(({ scope: scopeId }) => {
  const dispatch = useDispatch();
  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { configIndexPatterns, kibanaIndexPatterns, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, scopeId), deepEqual);
  const configAsSelectable: SelectablePatterns = useMemo(
    () => configIndexPatterns.map((title) => ({ title, id: SourcererPatternType.config })),
    [configIndexPatterns]
  );
  const { selectedPatterns, loading } = sourcererScope;
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<ComboBoxOptions>(
    selectedPatterns.map(({ title, id }, i) => ({
      label: title,
      value: id,
      color: getPatternColor(id),
      key: `${id}-${i}`,
    }))
  );
  const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);

  const setPopoverIsOpenCb = useCallback(() => setPopoverIsOpen((prevState) => !prevState), []);

  const onChangeIndexPattern = useCallback(
    (newSelectedPatterns: SelectablePatterns) => {
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: scopeId,
          selectedPatterns: newSelectedPatterns,
        })
      );
    },
    [dispatch, scopeId]
  );

  const onChangeCombo = useCallback(
    (newSelectedOptions: ComboBoxOptions) => {
      setSelectedOptions(filterKipAsSoloPattern(selectedOptions, newSelectedOptions));
    },
    [selectedOptions]
  );

  const resetDataSources = useCallback(() => {
    setSelectedOptions(
      configIndexPatterns.map((indexSelected, i) => ({
        label: indexSelected,
        value: SourcererPatternType.config,
        key: `${indexSelected}-${i}`,
      }))
    );
  }, [configIndexPatterns]);

  const handleSaveIndices = useCallback(() => {
    onChangeIndexPattern(
      selectedOptions.map((so) => ({
        title: so.label,
        id: so.value ?? SourcererPatternType.config,
      }))
    );
    setPopoverIsOpen(false);
  }, [onChangeIndexPattern, selectedOptions]);

  const handleClosePopOver = useCallback(() => {
    setPopoverIsOpen(false);
  }, []);

  const indexPatternOptions = useMemo(
    () =>
      [...configAsSelectable, ...kibanaIndexPatterns].reduce<ComboBoxOptions>(
        (acc, { title: index, id }, i) => {
          if (index != null) {
            return [
              ...acc,
              { label: index, value: id, color: getPatternColor(id), key: `${id}-${i}` },
            ];
          }
          return acc;
        },
        []
      ),
    [configAsSelectable, kibanaIndexPatterns]
  );

  const trigger = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={i18n.SOURCERER}
        data-test-subj="sourcerer-trigger"
        flush="left"
        iconSide="right"
        iconType="arrowDown"
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

  const comboBox = useMemo(
    () => (
      <EuiComboBox
        data-test-subj="indexPattern-switcher"
        fullWidth
        onChange={onChangeCombo}
        options={indexPatternOptions}
        placeholder={i18n.PICK_INDEX_PATTERNS}
        renderOption={renderPatternOption}
        selectedOptions={selectedOptions}
      />
    ),
    [indexPatternOptions, onChangeCombo, selectedOptions]
  );

  useEffect(() => {
    const newSelectedOptions = selectedPatterns.map(({ title, id }, i) => ({
      label: title,
      value: id,
      color: getPatternColor(id),
      key: `${id}-${i}`,
    }));
    setSelectedOptions((prevSelectedOptions) => {
      if (!deepEqual(newSelectedOptions, prevSelectedOptions)) {
        return newSelectedOptions;
      }
      return prevSelectedOptions;
    });
  }, [selectedPatterns]);

  const tooltipContent = useMemo(
    () => (isPopoverOpen ? null : sourcererScope.indexNames.sort().join(', ')),
    [isPopoverOpen, sourcererScope.indexNames]
  );

  return (
    <EuiToolTip position="top" content={tooltipContent}>
      <EuiPopover
        data-test-subj="sourcerer-popover"
        button={trigger}
        isOpen={isPopoverOpen}
        closePopover={handleClosePopOver}
        display="block"
        panelPaddingSize="s"
        repositionOnScroll
        ownFocus
      >
        <PopoverContent>
          <EuiPopoverTitle>
            <>{i18n.SELECT_INDEX_PATTERNS}</>
          </EuiPopoverTitle>
          <EuiSpacer size="s" />
          <EuiText color="default">{i18n.INDEX_PATTERNS_SELECTION_LABEL}</EuiText>
          <EuiSpacer size="xs" />
          {comboBox}
          <EuiSpacer size="s" />
          <ColorKey />
          <EuiPopoverFooter>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                <ResetButton
                  aria-label={i18n.INDEX_PATTERNS_RESET}
                  data-test-subj="sourcerer-reset"
                  flush="left"
                  onClick={resetDataSources}
                  size="l"
                  title={i18n.INDEX_PATTERNS_RESET}
                >
                  {i18n.INDEX_PATTERNS_RESET}
                </ResetButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={handleSaveIndices}
                  disabled={isSavingDisabled}
                  data-test-subj="add-index"
                  fill
                  fullWidth
                  size="s"
                >
                  {i18n.SAVE_INDEX_PATTERNS}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverFooter>
        </PopoverContent>
      </EuiPopover>
    </EuiToolTip>
  );
});
Sourcerer.displayName = 'Sourcerer';
