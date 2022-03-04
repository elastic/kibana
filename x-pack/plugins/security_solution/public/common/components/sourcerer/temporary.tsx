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
    title: i18n.CALL_OUT_DEPRECATED_TITLE,
    update: i18n.UPDATE_INDEX_PATTERNS,
  },
  missingPatterns: {
    title: i18n.CALL_OUT_MISSING_PATTERNS_TITLE,
    update: i18n.ADD_INDEX_PATTERN,
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

    return (
      <>
        <EuiCallOut
          color="warning"
          data-test-subj="sourcerer-deprecated-callout"
          iconType="alert"
          size="s"
          title={translations[isModified].title}
        />
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiTextColor color="subdued">
            <p>
              {activePatterns && activePatterns.length > 0 ? (
                <FormattedMessage
                  id="xpack.securitySolution.indexPatterns.currentPatterns"
                  defaultMessage="The active index patterns in this timeline are{tooltip}: {callout}"
                  values={{
                    tooltip:
                      deadPatterns.length > 0 ? (
                        <EuiToolTip
                          content={
                            <FormattedMessage
                              id="xpack.securitySolution.indexPatterns.noMatchData"
                              defaultMessage="The following index patterns are saved to this timeline but do not match any data streams, indices, or index aliases: {aliases}"
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
                  id="xpack.securitySolution.indexPatterns.currentPatternsBad"
                  defaultMessage="The current index patterns in this timeline are: {callout}"
                  values={{
                    callout: <Blockquote>{selectedPatterns.join(', ')}</Blockquote>,
                  }}
                />
              )}

              {isModified === 'deprecated' && (
                <FormattedMessage
                  id="xpack.securitySolution.indexPatterns.toggleToNewSourcerer"
                  defaultMessage="We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view {link}."
                  values={{
                    link: <EuiLink onClick={onReset}>{i18n.TOGGLE_TO_NEW_SOURCERER}</EuiLink>,
                  }}
                />
              )}
              {isModified === 'missingPatterns' && (
                <>
                  <FormattedMessage
                    id="xpack.securitySolution.indexPatterns.missingPatterns.callout"
                    defaultMessage="Security Data View is missing the following index patterns: {callout}"
                    values={{
                      callout: <Blockquote>{missingPatterns.join(', ')}</Blockquote>,
                    }}
                  />
                  <FormattedMessage
                    id="xpack.securitySolution.indexPatterns.missingPatterns.description"
                    defaultMessage="We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view {link}."
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
