import { ReactElement } from 'react';

export interface TimelinePluginSetup {
  getTimeline?: (props: TimelineProps) => ReactElement<TimelineProps>;
}

export interface TimelineProps {
  timelineId: string;
}
