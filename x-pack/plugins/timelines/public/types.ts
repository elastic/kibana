import { ReactElement } from 'react';

export interface TimelinesPluginSetup {
  getTimeline?: (props: TimelineProps) => ReactElement<TimelineProps>;
}

export interface TimelineProps {
  timelineId: string;
}
