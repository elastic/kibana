/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';

export const FileDataVisualizerWrapper: FC = () => {
  const [FileDataVisualizerComponent, setFileDataVisualizerComponent] = useState<FC<{}> | null>(
    null
  );

  useEffect(() => {
    if (FileDataVisualizerComponent === null) {
      import('../application/file_datavisualizer').then(({ FileDataVisualizer }) => {
        setFileDataVisualizerComponent(FileDataVisualizer);
      });
    }
  }, [FileDataVisualizerComponent]);

  return <>{FileDataVisualizerComponent}</>;
};
