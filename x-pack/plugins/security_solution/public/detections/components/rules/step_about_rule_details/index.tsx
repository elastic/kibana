/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPanel,
  EuiProgress,
  EuiButtonGroup,
  EuiButtonGroupOption,
  EuiSpacer,
  EuiFlexItem,
  EuiText,
  EuiFlexGroup,
  EuiResizeObserver,
} from '@elastic/eui';
import React, { memo, useCallback, useState } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash/fp';

import { HeaderSection } from '../../../../common/components/header_section';
import { Markdown } from '../../../../common/components/markdown';
import { AboutStepRule, AboutStepRuleDetails } from '../../../pages/detection_engine/rules/types';
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
}));

const VerticalOverflowContent = styled.div((props: { maxHeight: number }) => ({
  'max-height': `${props.maxHeight}px`,
}));

const AboutContent = styled.div`
  height: 100%;
`;

const toggleOptions: EuiButtonGroupOption[] = [
  {
    id: 'details',
    label: i18n.ABOUT_PANEL_DETAILS_TAB,
  },
  {
    id: 'notes',
    label: i18n.ABOUT_PANEL_NOTES_TAB,
  },
];

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

  return (
    <MyPanel>
      {loading && (
        <>
          <EuiProgress size="xs" color="accent" position="absolute" />
          <HeaderSection title={i18n.ABOUT_TEXT} />
        </>
      )}
      {stepData != null && stepDataDetails != null && (
        <FlexGroupFullHeight gutterSize="xs" direction="column">
          <EuiFlexItem grow={1} key="header">
            <HeaderSection title={i18n.ABOUT_TEXT}>
              {!isEmpty(stepDataDetails.note) && stepDataDetails.note.trim() !== '' && (
                <EuiButtonGroup
                  options={toggleOptions}
                  idSelected={selectedToggleOption}
                  onChange={(val) => {
                    setToggleOption(val);
                  }}
                  data-test-subj="stepAboutDetailsToggle"
                />
              )}
            </HeaderSection>
          </EuiFlexItem>
          <EuiFlexItem grow={5} key="details">
            {selectedToggleOption === 'details' ? (
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
            ) : (
              <VerticalOverflowContainer
                data-test-subj="stepAboutDetailsNoteContent"
                maxHeight={aboutPanelHeight}
              >
                <VerticalOverflowContent
                  maxHeight={aboutPanelHeight}
                  className="eui-yScrollWithShadows"
                >
                  <Markdown raw={stepDataDetails.note} />
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
