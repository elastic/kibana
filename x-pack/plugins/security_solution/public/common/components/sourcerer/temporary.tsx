/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiLink,
  EuiText,
  EuiTextColor,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import * as i18n from './translations';
import { Blockquote, ResetButton } from './helpers';
import { UpdateDefaultDataViewModal } from './update_default_data_view_modal';
import { TimelineId, TimelineType } from '../../../../common/types';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

interface Props {
  activePatterns?: string[];
  indicesExist: boolean;
  isModified: 'deprecated' | 'missingPatterns';
  missingPatterns: string[];
  onDismiss: () => void;
  onReset: () => void;
  onUpdate: () => void;
  selectedPatterns: string[];
}

const translations = {
  deprecated: {
    title: {
      [TimelineType.default]: i18n.CALL_OUT_DEPRECATED_TITLE,
      [TimelineType.template]: i18n.CALL_OUT_DEPRECATED_TEMPLATE_TITLE,
    },
    update: i18n.UPDATE_INDEX_PATTERNS,
  },
  missingPatterns: {
    title: {
      [TimelineType.default]: i18n.CALL_OUT_MISSING_PATTERNS_TITLE,
      [TimelineType.template]: i18n.CALL_OUT_MISSING_PATTERNS_TEMPLATE_TITLE,
    },
    update: i18n.ADD_INDEX_PATTERN,
  },
};

const messages = {
  currentPatterns: {
    [TimelineType.default]: {
      id: 'xpack.securitySolution.indexPatterns.currentPatterns',
      defaultMessage: 'The active index patterns in this timeline are{tooltip}: {callout}',
    },
    [TimelineType.template]: {
      id: 'xpack.securitySolution.indexPatterns.timelineTemplate.currentPatterns',
      defaultMessage: 'The active index patterns in this timeline template are{tooltip}: {callout}',
    },
  },
  noMatchData: {
    [TimelineType.default]: {
      id: 'xpack.securitySolution.indexPatterns.noMatchData',
      defaultMessage:
        'The following index patterns are saved to this timeline but do not match any data streams, indices, or index aliases: {aliases}',
    },
    [TimelineType.template]: {
      id: 'xpack.securitySolution.indexPatterns.timelineTemplate.noMatchData',
      defaultMessage:
        'The following index patterns are saved to this timeline template but do not match any data streams, indices, or index aliases: {aliases}',
    },
  },
  badCurrentPatterns: {
    [TimelineType.default]: {
      id: 'xpack.securitySolution.indexPatterns.currentPatternsBad',
      defaultMessage: 'The current index patterns in this timeline are: {callout}',
    },
    [TimelineType.template]: {
      id: 'xpack.securitySolution.indexPatterns.timelineTemplate.currentPatternsBad',
      defaultMessage: 'The current index patterns in this timeline template are: {callout}',
    },
  },
  deprecated: {
    [TimelineType.default]: {
      id: 'xpack.securitySolution.indexPatterns.toggleToNewSourcerer',
      defaultMessage:
        "We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view {link}.",
    },
    [TimelineType.template]: {
      id: 'xpack.securitySolution.indexPatterns.timelineTemplate.toggleToNewSourcerer',
      defaultMessage:
        "We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view {link}.",
    },
  },
  missingPatterns: {
    [TimelineType.default]: {
      id: 'xpack.securitySolution.indexPatterns.missingPatterns.description',
      defaultMessage:
        "We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view {link}.",
    },
    [TimelineType.template]: {
      id: 'xpack.securitySolution.indexPatterns.missingPatterns.timelineTemplate.description',
      defaultMessage:
        "We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view {link}.",
    },
  },
};

export const TemporarySourcererComp = React.memo<Props>(
  ({
    activePatterns,
    indicesExist,
    isModified,
    onDismiss,
    onReset,
    onUpdate,
    selectedPatterns,
    missingPatterns,
  }) => {
    const trigger = useMemo(
      () => (
        <EuiButton
          data-test-subj="sourcerer-deprecated-update"
          fill
          fullWidth
          onClick={onUpdate}
          size="s"
          disabled={!indicesExist}
        >
          {translations[isModified].update}
        </EuiButton>
      ),
      [indicesExist, isModified, onUpdate]
    );
    const buttonWithTooltip = useMemo(
      () =>
        !indicesExist ? (
          <EuiToolTip position="top" content={i18n.NO_DATA} data-test-subj="sourcerer-tooltip">
            {trigger}
          </EuiToolTip>
        ) : (
          trigger
        ),
      [indicesExist, trigger]
    );

    const deadPatterns =
      activePatterns && activePatterns.length > 0
        ? selectedPatterns.filter((p) => !activePatterns.includes(p))
        : [];
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

    const timelineType = useDeepEqualSelector(
      (state) => (getTimeline(state, TimelineId.active) ?? timelineDefaults).timelineType
    );
    return (
      <>
        <EuiCallOut
          color="warning"
          data-test-subj="sourcerer-deprecated-callout"
          iconType="alert"
          size="s"
          title={translations[isModified].title[timelineType]}
        />
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiTextColor color="subdued">
            <p>
              {activePatterns && activePatterns.length > 0 ? (
                <FormattedMessage
                  data-test-subj="sourcerer-current-patterns-message"
                  id={messages.currentPatterns[timelineType].id}
                  defaultMessage={messages.currentPatterns[timelineType].defaultMessage}
                  values={{
                    tooltip:
                      deadPatterns.length > 0 ? (
                        <EuiToolTip
                          content={
                            <FormattedMessage
                              id={messages.noMatchData[timelineType].id}
                              defaultMessage={messages.noMatchData[timelineType].defaultMessage}
                              values={{
                                aliases: selectedPatterns
                                  .filter((p) => !activePatterns.includes(p))
                                  .join(', '),
                              }}
                            />
                          }
                        >
                          <EuiIcon type="questionInCircle" title={i18n.INACTIVE_PATTERNS} />
                        </EuiToolTip>
                      ) : null,
                    callout: <Blockquote>{activePatterns.join(', ')}</Blockquote>,
                  }}
                />
              ) : (
                <FormattedMessage
                  id={messages.badCurrentPatterns[timelineType].id}
                  defaultMessage={messages.badCurrentPatterns[timelineType].defaultMessage}
                  values={{
                    callout: <Blockquote>{selectedPatterns.join(', ')}</Blockquote>,
                  }}
                />
              )}

              {isModified === 'deprecated' && (
                <FormattedMessage
                  data-test-subj="sourcerer-deprecated-message"
                  id={messages.deprecated[timelineType].id}
                  defaultMessage={messages.deprecated[timelineType].defaultMessage}
                  values={{
                    link: <EuiLink onClick={onReset}>{i18n.TOGGLE_TO_NEW_SOURCERER}</EuiLink>,
                  }}
                />
              )}
              {isModified === 'missingPatterns' && (
                <>
                  <FormattedMessage
                    data-test-subj="sourcerer-missing-patterns-callout"
                    id="xpack.securitySolution.indexPatterns.missingPatterns.callout"
                    defaultMessage="Security Data View is missing the following index patterns: {callout}"
                    values={{
                      callout: <Blockquote>{missingPatterns.join(', ')}</Blockquote>,
                    }}
                  />
                  <FormattedMessage
                    data-test-subj="sourcerer-missing-patterns-message"
                    id={messages.missingPatterns[timelineType].id}
                    defaultMessage={messages.missingPatterns[timelineType].defaultMessage}
                    values={{
                      link: <EuiLink onClick={onReset}>{i18n.TOGGLE_TO_NEW_SOURCERER}</EuiLink>,
                    }}
                  />
                </>
              )}
            </p>
          </EuiTextColor>
        </EuiText>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <ResetButton
              aria-label={i18n.INDEX_PATTERNS_CLOSE}
              data-test-subj="sourcerer-deprecated-close"
              flush="left"
              onClick={onDismiss}
              title={i18n.INDEX_PATTERNS_CLOSE}
            >
              {i18n.INDEX_PATTERNS_CLOSE}
            </ResetButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{buttonWithTooltip}</EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

TemporarySourcererComp.displayName = 'TemporarySourcererComp';

interface TemporarySourcererProps {
  activePatterns?: string[];
  indicesExist: boolean;
  isModified: 'deprecated' | 'missingPatterns';
  isShowingUpdateModal: boolean;
  missingPatterns: string[];
  onContinueWithoutUpdate: () => void;
  onDismiss: () => void;
  onDismissModal: () => void;
  onReset: () => void;
  onUpdateStepOne: () => void;
  onUpdateStepTwo: () => void;
  selectedPatterns: string[];
}

export const TemporarySourcerer = React.memo<TemporarySourcererProps>(
  ({
    activePatterns,
    indicesExist,
    isModified,
    missingPatterns,
    onContinueWithoutUpdate,
    onDismiss,
    onReset,
    onUpdateStepOne,
    onUpdateStepTwo,
    selectedPatterns,
    isShowingUpdateModal,
    onDismissModal,
  }) => (
    <>
      <TemporarySourcererComp
        activePatterns={activePatterns}
        indicesExist={indicesExist}
        isModified={isModified}
        missingPatterns={missingPatterns}
        onDismiss={onDismiss}
        onReset={onReset}
        onUpdate={onUpdateStepOne}
        selectedPatterns={selectedPatterns}
      />
      <UpdateDefaultDataViewModal
        isShowing={isShowingUpdateModal}
        missingPatterns={missingPatterns}
        onDismissModal={onDismissModal}
        onContinue={onContinueWithoutUpdate}
        onUpdate={onUpdateStepTwo}
      />
    </>
  )
);

TemporarySourcerer.displayName = 'TemporarySourcerer';
