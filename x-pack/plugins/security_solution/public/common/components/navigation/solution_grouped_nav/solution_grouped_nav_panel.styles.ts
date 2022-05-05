/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const groupedNavPanelStyles = (isTimelineVisible: boolean) => ({
  panel: `
    position: fixed;
    top: 95px;
    left: 247px;
    bottom: 0;
    width: 340px;
    height: inherit;

    box-shadow-bottom: none;

    // If the bottom bar is visible add padding to the navigation
    ${
      isTimelineVisible &&
      `
        height: inherit;
        bottom: 51px;
        box-shadow: 
          -8px 0 8px -8px rgb(0 0 0 / 15%), // left
          8px 0 8px -8px rgb(0 0 0 / 15%), // right
          inset 0 -4px 4px -4px rgb(0 0 0 / 6%); // bottom inset to match timeline bar top shadow
      `
    }
  `,
});
