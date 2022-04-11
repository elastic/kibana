/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { TimelineType } from '../../../../common/types';

export const CurrentPatternsMessage = ({
  timelineType,
  values,
}: {
  timelineType: TimelineType;
  values:
    | {
        [key: string]: ReactIntl.MessageValue | JSX.Element;
      }
    | undefined;
}) => {
  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        data-test-subj="sourcerer-current-patterns-message"
        id="xpack.securitySolution.indexPatterns.timelineTemplate.currentPatterns"
        defaultMessage="The active index patterns in this timeline template are{tooltip}: {callout}"
        values={values}
      />
    );
  }

  return (
    <FormattedMessage
      data-test-subj="sourcerer-current-patterns-message"
      id="xpack.securitySolution.indexPatterns.timeline.currentPatterns"
      defaultMessage="The active index patterns in this timeline are{tooltip}: {callout}"
      values={values}
    />
  );
};

export const NoMatchDataMessage = ({
  timelineType,
  values,
}: {
  timelineType: TimelineType;
  values:
    | {
        [key: string]: ReactIntl.MessageValue | JSX.Element;
      }
    | undefined;
}) => {
  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.indexPatterns.timelineTemplate.noMatchData"
        defaultMessage="The following index patterns are saved to this timeline template but do not match any data streams, indices, or index aliases: {aliases}"
        values={values}
      />
    );
  }

  return (
    <FormattedMessage
      id="xpack.securitySolution.indexPatterns.timeline.noMatchData"
      defaultMessage="The following index patterns are saved to this timeline but do not match any data streams, indices, or index aliases: {aliases}"
      values={values}
    />
  );
};

export const BadCurrentPatternsMessage = ({
  timelineType,
  values,
}: {
  timelineType: TimelineType;
  values:
    | {
        [key: string]: ReactIntl.MessageValue | JSX.Element;
      }
    | undefined;
}) => {
  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.indexPatterns.timelineTemplate.currentPatternsBad"
        defaultMessage="The current index patterns in this timeline template are: {callout}"
        values={values}
      />
    );
  }
  return (
    <FormattedMessage
      id="xpack.securitySolution.indexPatterns.timeline.currentPatternsBad"
      defaultMessage="The current index patterns in this timeline are: {callout}"
      values={values}
    />
  );
};

export const DeprecatedMessage = ({
  timelineType,
  values,
}: {
  timelineType: TimelineType;
  values:
    | {
        [key: string]: ReactIntl.MessageValue | JSX.Element;
      }
    | undefined;
}) => {
  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        data-test-subj="sourcerer-deprecated-message"
        id="xpack.securitySolution.indexPatterns.timelineTemplate.toggleToNewSourcerer"
        defaultMessage="We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view {link}."
        values={values}
      />
    );
  }
  return (
    <FormattedMessage
      data-test-subj="sourcerer-deprecated-message"
      id="xpack.securitySolution.indexPatterns.timeline.toggleToNewSourcerer"
      defaultMessage="We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view {link}."
      values={values}
    />
  );
};

export const MissingPatternsMessage = ({
  timelineType,
  values,
}: {
  timelineType: TimelineType;
  values:
    | {
        [key: string]: ReactIntl.MessageValue | JSX.Element;
      }
    | undefined;
}) => {
  if (timelineType === TimelineType.template) {
    return (
      <FormattedMessage
        data-test-subj="sourcerer-missing-patterns-message"
        id="xpack.securitySolution.indexPatterns.missingPatterns.timelineTemplate.description"
        defaultMessage="We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view {link}."
        values={values}
      />
    );
  }
  return (
    <FormattedMessage
      data-test-subj="sourcerer-missing-patterns-message"
      id="xpack.securitySolution.indexPatterns.missingPatterns.timeline.description"
      defaultMessage="We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view {link}."
      values={values}
    />
  );
};
