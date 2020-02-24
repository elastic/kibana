/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export interface DrilldownHelloBarProps {
  docsLink?: string;
}

export const DrilldownHelloBar: React.FC<DrilldownHelloBarProps> = ({ docsLink }) => {
  return (
    <div>
      <p>
        Drilldowns provide the ability to define a new behavior when interacting with a panel. You
        can add multiple options or simply override the default filtering behavior.
      </p>
      <a href={docsLink}>View docs</a>
      <img
        src="https://user-images.githubusercontent.com/9773803/72729009-e5803180-3b8e-11ea-8330-b86089bf5f0a.png"
        alt=""
      />
    </div>
  );
};
