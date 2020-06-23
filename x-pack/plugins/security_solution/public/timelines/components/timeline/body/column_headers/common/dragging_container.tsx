/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC, memo, useEffect } from 'react';

interface DraggingContainerProps {
  children: JSX.Element;
  onDragging: Function;
}

const DraggingContainerComponent: FC<DraggingContainerProps> = ({ children, onDragging }) => {
  useEffect(() => {
    onDragging(true);

    return () => onDragging(false);
  });

  return children;
};

export const DraggingContainer = memo(DraggingContainerComponent);
