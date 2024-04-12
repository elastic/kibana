import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { useMemo } from "react";
import { getEventType, isEvenEqlSequence, isEventBuildingBlockType } from "../../body/helpers";

export const useEventTypeRowStyling = (ecsData: TimelineItem['ecs']) => {
    const eventType = useMemo(() => getEventType(ecsData), []);
    const eventTypeClassName = useMemo(
      () =>
        eventType === 'raw'
          ? 'rawEvent'
          : eventType === 'eql'
          ? isEvenEqlSequence(ecsData)
            ? 'eqlSequence'
            : 'eqlNonSequence'
          : 'nonRawEvent',
      [ecsData, eventType]
    );
    const buildingBlockTypeClassName = useMemo(
      () => (isEventBuildingBlockType(ecsData) ? 'buildingBlockType' : ''),
      [ecsData]
    );

    return useMemo(() => `${eventTypeClassName} ${buildingBlockTypeClassName}`, []);
}