/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import React from 'react';

import { RecentTimelineHeader } from './header';
import {
  OnOpenTimeline,
  OpenTimelineResult,
} from '../../../timelines/components/open_timeline/types';
import { WithHoverActions } from '../../../common/components/with_hover_actions';

import { RecentTimelineCounts } from './counts';
import * as i18n from './translations';

export const RecentTimelines = React.memo<{
  noTimelinesMessage: string;
  onOpenTimeline: OnOpenTimeline;
  timelines: OpenTimelineResult[];
}>(({ noTimelinesMessage, onOpenTimeline, timelines }) => {
  if (timelines.length === 0) {
    return (
      <>
        <EuiText color="subdued" size="s">
          {noTimelinesMessage}
        </EuiText>
      </>
    );
  }

  return (
    <>
      {timelines.map((t, i) => (
        <React.Fragment key={`${t.savedObjectId}-${i}`}>
          <WithHoverActions
            render={(showHoverContent) => (
              <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <RecentTimelineHeader onOpenTimeline={onOpenTimeline} timeline={t} />
                  <RecentTimelineCounts timeline={t} />
                  {t.description && t.description.length && (
                    <EuiText color="subdued" size="xs">
                      {t.description}
                    </EuiText>
                  )}
                </EuiFlexItem>

                {showHoverContent && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={i18n.OPEN_AS_DUPLICATE}>
                      <EuiButtonIcon
                        aria-label={i18n.OPEN_AS_DUPLICATE}
                        data-test-subj="open-duplicate"
                        isDisabled={t.savedObjectId == null}
                        iconSize="s"
                        iconType="copy"
                        onClick={() =>
                          onOpenTimeline({
                            duplicate: true,
                            timelineId: `${t.savedObjectId}`,
                          })
                        }
                        size="s"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            )}
          />
          <>{i !== timelines.length - 1 && <EuiSpacer size="l" />}</>
        </React.Fragment>
      ))}
    </>
  );
});

RecentTimelines.displayName = 'RecentTimelines';
