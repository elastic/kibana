/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export type TransitionState = 'ready' | 'back' | 'next';

export function FilmstripTransition({
  children,
  duration,
  transition,
}: PropsWithChildren<{ duration: number; transition: TransitionState }>) {
  return (
    <div
      style={{
        display: 'flex',
        flexFlow: 'column nowrap',
        flexGrow: 1,
        position: 'relative',
        zIndex: 0,
        transitionTimingFunction: 'ease-in-out',
        transition:
          transition !== 'ready' ? `transform ${duration}ms` : undefined,
        transform:
          transition === 'ready'
            ? 'translateX(0)'
            : transition === 'back'
            ? 'translateX(200%)'
            : 'translateX(-200%)',
      }}
    >
      {children}
    </div>
  );
}

export function FilmstripFrame({
  children,
  position,
}: PropsWithChildren<{ position: 'left' | 'center' | 'right' }>) {
  return (
    <EuiFlexGroup
      // alignItems="center"
      // justifyContent="spaceAround"
      alignItems="flexStart"
      style={
        position !== 'center'
          ? {
              position: 'absolute',
              width: '100%',
              height: '100%',
              transform:
                position === 'left' ? 'translateX(-200%)' : 'translateX(200%)',
              pointerEvents: 'none',
            }
          : undefined
      }
    >
      <EuiFlexItem>{children}</EuiFlexItem>
      {/* <EuiFlexItem grow={false}>{children}</EuiFlexItem>*/}
    </EuiFlexGroup>
  );
}
