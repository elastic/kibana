/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationRevision, InvestigateWidget } from '@kbn/investigate-plugin/common';
import { EMBEDDABLE_WIDGET_NAME } from '../../constants';
import type { EmbeddableWidget } from '../../widgets/embeddable_widget/types';

function getDisplayTypeOfWidget(widget: InvestigateWidget) {
  if (widget.type !== EMBEDDABLE_WIDGET_NAME) {
    return widget.type;
  }

  const {
    parameters: { type },
  } = widget as EmbeddableWidget;

  return type;
}

export function serializeTimelineForAssistant(timelineItems: InvestigationRevision['items']) {
  const message = `## Timeline
  
  What follows is a description of what the user sees on their screen, starting at the very items on the top,
  and ending with the items on the bottom. The items on the bottom were added last, so those are most recent.

  `;

  return timelineItems.reduce((prev, current) => {
    return (prev += `### ${current.title}
    
    Type: ${getDisplayTypeOfWidget(current)}

    ${current.description ? `Description: ${current.description}` : ''}

    Parameters:
    \`\`\`json
    ${JSON.stringify(current.parameters)}
    \`\`\`

    `);
  }, message);
}
