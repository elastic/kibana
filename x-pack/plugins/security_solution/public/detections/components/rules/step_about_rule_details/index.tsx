/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiPanel,
  EuiProgress,
  EuiButtonGroup,
  EuiSpacer,
  EuiFlexItem,
  EuiText,
  EuiFlexGroup,
  EuiResizeObserver,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { memo, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { HeaderSection } from '../../../../common/components/header_section';
import { MarkdownRenderer } from '../../../../common/components/markdown_editor';
import type {
  AboutStepRule,
  AboutStepRuleDetails,
} from '../../../pages/detection_engine/rules/types';
import * as i18n from './translations';
import { StepAboutRule } from '../step_about_rule';

const MyPanel = styled(EuiPanel)`
  position: relative;
`;

const FlexGroupFullHeight = styled(EuiFlexGroup)`
  height: 100%;
`;

const VerticalOverflowContainer = styled.div((props: { maxHeight: number }) => ({
  'max-height': `${props.maxHeight}px`,
  'overflow-y': 'hidden',
  'word-break': 'break-word',
}));

const VerticalOverflowContent = styled.div((props: { maxHeight: number }) => ({
  'max-height': `${props.maxHeight}px`,
}));

const AboutContent = styled.div`
  height: 100%;
`;

const detailsOption: EuiButtonGroupOptionProps = {
  id: 'details',
  label: i18n.ABOUT_PANEL_DETAILS_TAB,
  'data-test-subj': 'stepAboutDetailsToggle-details',
};
const notesOption: EuiButtonGroupOptionProps = {
  id: 'notes',
  label: i18n.ABOUT_PANEL_NOTES_TAB,
  'data-test-subj': 'stepAboutDetailsToggle-notes',
};
const setupOption: EuiButtonGroupOptionProps = {
  id: 'setup',
  label: i18n.ABOUT_PANEL_SETUP_TAB,
  'data-test-subj': 'stepAboutDetailsToggle-setup',
};

interface StepPanelProps {
  stepData: AboutStepRule | null;
  stepDataDetails: AboutStepRuleDetails | null;
  loading: boolean;
}

const StepAboutRuleToggleDetailsComponent: React.FC<StepPanelProps> = ({
  stepData,
  stepDataDetails,
  loading,
}) => {
  const [selectedToggleOption, setToggleOption] = useState('details');
  const [aboutPanelHeight, setAboutPanelHeight] = useState(0);

  const onResize = useCallback(
    (e: { height: number; width: number }) => {
      setAboutPanelHeight(e.height);
    },
    [setAboutPanelHeight]
  );

  const toggleOptions: EuiButtonGroupOptionProps[] = useMemo(() => {
    const notesExist = !isEmpty(stepDataDetails?.note) && stepDataDetails?.note.trim() !== '';
    const setupExists = !isEmpty(stepDataDetails?.setup) && stepDataDetails?.setup.trim() !== '';
    return [
      ...(notesExist || setupExists ? [detailsOption] : []),
      ...(notesExist ? [notesOption] : []),
      ...(setupExists ? [setupOption] : []),
    ];
  }, [stepDataDetails]);

  return (
    <MyPanel hasBorder>
      {loading && (
        <>
          <EuiProgress size="xs" color="accent" position="absolute" />
          <HeaderSection title={i18n.ABOUT_TEXT} />
        </>
      )}
      {stepData != null && stepDataDetails != null && (
        <FlexGroupFullHeight gutterSize="xs" direction="column">
          <EuiFlexItem grow={false} key="header">
            <HeaderSection title={i18n.ABOUT_TEXT}>
              {toggleOptions.length > 0 && (
                <EuiButtonGroup
                  options={toggleOptions}
                  idSelected={selectedToggleOption}
                  onChange={(val) => {
                    setToggleOption(val);
                  }}
                  data-test-subj="stepAboutDetailsToggle"
                  legend={i18n.ABOUT_CONTROL_LEGEND}
                />
              )}
            </HeaderSection>
          </EuiFlexItem>
          <EuiFlexItem key="details">
            {selectedToggleOption === 'details' && (
              <EuiResizeObserver data-test-subj="stepAboutDetailsContent" onResize={onResize}>
                {(resizeRef) => (
                  <AboutContent ref={resizeRef}>
                    <VerticalOverflowContainer maxHeight={120}>
                      <VerticalOverflowContent maxHeight={120} className="eui-yScrollWithShadows">
                        <EuiText
                          size="s"
                          data-test-subj="stepAboutRuleDetailsToggleDescriptionText"
                        >
                          {stepDataDetails.description}
                        </EuiText>
                      </VerticalOverflowContent>
                    </VerticalOverflowContainer>
                    <EuiSpacer size="m" />
                    <StepAboutRule
                      descriptionColumns="singleSplit"
                      isReadOnlyView={true}
                      isLoading={false}
                      defaultValues={stepData}
                    />
                  </AboutContent>
                )}
              </EuiResizeObserver>
            )}
            {selectedToggleOption === 'notes' && (
              <VerticalOverflowContainer
                data-test-subj="stepAboutDetailsNoteContent"
                maxHeight={aboutPanelHeight}
              >
                <VerticalOverflowContent
                  maxHeight={aboutPanelHeight}
                  className="eui-yScrollWithShadows"
                >
                  <MarkdownRenderer>{stepDataDetails.note}</MarkdownRenderer>
                </VerticalOverflowContent>
              </VerticalOverflowContainer>
            )}
            {selectedToggleOption === 'setup' && (
              <VerticalOverflowContainer
                data-test-subj="stepAboutDetailsSetupContent"
                maxHeight={aboutPanelHeight}
              >
                <VerticalOverflowContent
                  maxHeight={aboutPanelHeight}
                  className="eui-yScrollWithShadows"
                >
                  <MarkdownRenderer>{stepDataDetails.setup}</MarkdownRenderer>
                </VerticalOverflowContent>
              </VerticalOverflowContainer>
            )}
          </EuiFlexItem>
        </FlexGroupFullHeight>
      )}
    </MyPanel>
  );
};

export const StepAboutRuleToggleDetails = memo(StepAboutRuleToggleDetailsComponent);
