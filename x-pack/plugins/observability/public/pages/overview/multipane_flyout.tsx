/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

interface Slot {
  title?: string;
  content: JSX.Element;
  closeable?: boolean;
  initialWidth?: string;
  initialHeight?: string;
}

interface Props {
  slotOne: Slot;
  flexDirection: 'column' | 'row';
  isSwitchable?: boolean;
  slotTwo?: Slot;
  onClose: () => void;
}

export function MultiPaneFlyout({ slotOne, slotTwo, flexDirection, isSwitchable, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [flexBasisCol1, setFlexBasisCol1] = useState(slotOne.initialWidth ?? '100%');
  const [flexBasisCol2, setFlexBasisCol2] = useState(slotTwo?.initialWidth ?? '50%');

  const handleDrag = (event: React.DragEvent<HTMLDivElement>) => {
    const { x, y, width, height } = containerRef.current?.getBoundingClientRect() || {};

    const { clientX, clientY } = event;

    const draggerMovedPos = flexDirection === 'row' ? clientX : clientY;
    const containerOffset = flexDirection === 'row' ? x : y;
    const containerSurface = flexDirection === 'row' ? width : height;

    if (draggerMovedPos && containerOffset && containerSurface) {
      const newValue = Math.max(
        Math.floor(((draggerMovedPos - containerOffset) / containerSurface) * 100),
        0
      );

      const newValue2 = Math.min(100 - newValue, 100);

      setFlexBasisCol1(`${newValue}%`);
      setFlexBasisCol2(`${newValue2}%`);
    }
  };

  useEffect(() => {
    if (slotTwo) {
      setFlexBasisCol1('50%');
      setFlexBasisCol2('50%');
    }
  }, [slotTwo]);

  return (
    <EuiFlyout onClose={onClose} size={'m'} ownFocus={false}>
      <EuiFlexGroup
        direction={flexDirection}
        gutterSize={'none'}
        style={{ height: '100%' }}
        ref={containerRef}
      >
        <EuiFlexItem
          style={{
            flexBasis: flexBasisCol1,
            ...(slotTwo
              ? flexDirection === 'row'
                ? { borderRight: `solid 1px ${euiThemeVars.euiBorderColor}` }
                : { borderBottom: `solid 1px ${euiThemeVars.euiBorderColor}` }
              : {}),
          }}
        >
          <Slot title={slotOne.title} content={slotOne.content} />
        </EuiFlexItem>

        {slotTwo ? (
          <div
            draggable
            style={{
              height: flexDirection === 'row' ? '100%' : 5,
              width: flexDirection === 'row' ? 5 : '100%',
              cursor: flexDirection === 'row' ? 'col-resize' : 'row-resize',
              opacity: 0,
            }}
            onDrag={handleDrag}
          />
        ) : null}

        <EuiFlexItem
          style={{
            flexBasis: flexBasisCol2,
            height: '100%',
          }}
        >
          {slotTwo ? <Slot title={slotTwo.title} content={slotTwo.content} /> : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyout>
  );
}

function Slot({ title, content }: { title?: string; content: JSX.Element }) {
  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="m"
      style={{ paddingTop: 12, paddingBottom: 12 }}
    >
      {title ? (
        <>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
        </>
      ) : null}

      {content}
    </EuiPanel>
  );
}
