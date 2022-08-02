/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { TimelineType } from '../../../../common/types';
import { Blockquote } from './helpers';
import * as i18n from './translations';

export const CurrentPatternsMessage = ({
  activePatterns,
  deadPatterns,
  selectedPatterns,
  timelineType,
}: {
  activePatterns: string[];
  deadPatterns: string[];
  selectedPatterns: string[];
  timelineType: TimelineType;
}) => {
  const tooltip = useMemo(
    () =>
      deadPatterns.length > 0 ? (
        <EuiToolTip
          content={
            <NoMatchDataMessage
              activePatterns={activePatterns}
              selectedPatterns={selectedPatterns}
              timelineType={timelineType}
            />
          }
        >
          <EuiIcon type="questionInCircle" title={i18n.INACTIVE_PATTERNS} />
        </EuiToolTip>
      ) : null,
    [activePatterns, deadPatterns.length, selectedPatterns, timelineType]
  );

  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        data-test-subj="sourcerer-current-patterns-message"
        id="xpack.securitySolution.indexPatterns.timelineTemplate.currentPatterns"
        defaultMessage="The active index patterns in this timeline template are{tooltip}: {callout}"
        values={{
          tooltip,
          callout: <Blockquote>{activePatterns.join(', ')}</Blockquote>,
        }}
      />
    );
  }

  return (
    <FormattedMessage
      data-test-subj="sourcerer-current-patterns-message"
      id="xpack.securitySolution.indexPatterns.timeline.currentPatterns"
      defaultMessage="The active index patterns in this timeline are{tooltip}: {callout}"
      values={{
        tooltip,
        callout: <Blockquote>{activePatterns.join(', ')}</Blockquote>,
      }}
    />
  );
};

export const NoMatchDataMessage = ({
  activePatterns,
  selectedPatterns,
  timelineType,
}: {
  activePatterns: string[];
  selectedPatterns: string[];
  timelineType: TimelineType;
}) => {
  const aliases = useMemo(
    () => selectedPatterns.filter((p) => !activePatterns.includes(p)).join(', '),
    [activePatterns, selectedPatterns]
  );
  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.indexPatterns.timelineTemplate.noMatchData"
        defaultMessage="The following index patterns are saved to this timeline template but do not match any data streams, indices, or index aliases: {aliases}"
        values={{
          aliases,
        }}
      />
    );
  }

  return (
    <FormattedMessage
      id="xpack.securitySolution.indexPatterns.timeline.noMatchData"
      defaultMessage="The following index patterns are saved to this timeline but do not match any data streams, indices, or index aliases: {aliases}"
      values={{
        aliases,
      }}
    />
  );
};

export const BadCurrentPatternsMessage = ({
  timelineType,
  selectedPatterns,
}: {
  timelineType: TimelineType;
  selectedPatterns: string[];
}) => {
  const callout = useMemo(
    () => <Blockquote>{selectedPatterns.join(', ')}</Blockquote>,
    [selectedPatterns]
  );

  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.indexPatterns.timelineTemplate.currentPatternsBad"
        defaultMessage="The current index patterns in this timeline template are: {callout}"
        values={{
          callout,
        }}
      />
    );
  }
  return (
    <FormattedMessage
      id="xpack.securitySolution.indexPatterns.timeline.currentPatternsBad"
      defaultMessage="The current index patterns in this timeline are: {callout}"
      values={{
        callout,
      }}
    />
  );
};

export const DeprecatedMessage = ({
  onReset,
  timelineType,
}: {
  onReset: () => void;
  timelineType: TimelineType;
}) => {
  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        data-test-subj="sourcerer-deprecated-message"
        id="xpack.securitySolution.indexPatterns.timelineTemplate.toggleToNewSourcerer"
        defaultMessage="We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view {link}."
        values={{
          link: <EuiLink onClick={onReset}>{i18n.TOGGLE_TO_NEW_SOURCERER}</EuiLink>,
        }}
      />
    );
  }
  return (
    <FormattedMessage
      data-test-subj="sourcerer-deprecated-message"
      id="xpack.securitySolution.indexPatterns.timeline.toggleToNewSourcerer"
      defaultMessage="We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view {link}."
      values={{
        link: <EuiLink onClick={onReset}>{i18n.TOGGLE_TO_NEW_SOURCERER}</EuiLink>,
      }}
    />
  );
};

export const MissingPatternsMessage = ({
  onReset,
  timelineType,
}: {
  timelineType: TimelineType;
  onReset: () => void;
}) => {
  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        data-test-subj="sourcerer-missing-patterns-message"
        id="xpack.securitySolution.indexPatterns.missingPatterns.timelineTemplate.description"
        defaultMessage="We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view {link}."
        values={{
          link: <EuiLink onClick={onReset}>{i18n.TOGGLE_TO_NEW_SOURCERER}</EuiLink>,
        }}
      />
    );
  }
  return (
    <FormattedMessage
      data-test-subj="sourcerer-missing-patterns-message"
      id="xpack.securitySolution.indexPatterns.missingPatterns.timeline.description"
      defaultMessage="We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view {link}."
      values={{
        link: <EuiLink onClick={onReset}>{i18n.TOGGLE_TO_NEW_SOURCERER}</EuiLink>,
      }}
    />
  );
};
