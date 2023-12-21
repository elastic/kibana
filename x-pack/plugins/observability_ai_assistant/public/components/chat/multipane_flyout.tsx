/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

interface Slot {
  title?: string;
  content: JSX.Element;
  closeable?: boolean;
  initialWidth?: number;
  initialHeight?: number;
}

interface Props {
  slotOne: Slot;
  flexDirection: 'column' | 'row';
  isSwitchable?: boolean;
  size?: 's' | 'm' | 'l';
  slotTwo?: Slot;
  onClose: () => void;
}

export function MultiPaneFlyout({
  slotOne,
  slotTwo,
  flexDirection,
  isSwitchable,
  size = 'm',
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [flexDirectionState, setFlexDirectionState] = useState(flexDirection);

  const [flexBasisCol1, setFlexBasisCol1] = useState(slotOne.initialWidth ?? 100);
  const [flexBasisCol2, setFlexBasisCol2] = useState(slotTwo?.initialWidth ?? 50);

  const handleDrag = (event: React.DragEvent<HTMLDivElement>) => {
    const { x, y, width, height } = containerRef.current?.getBoundingClientRect() || {};

    const { clientX, clientY } = event;

    const draggerMovedPos = flexDirectionState === 'row' ? clientX : clientY;
    const containerOffset = flexDirectionState === 'row' ? x : y;
    const containerSurface = flexDirectionState === 'row' ? width : height;

    if (draggerMovedPos && containerOffset && containerSurface) {
      const newValue = Math.max(
        Math.floor(((draggerMovedPos - containerOffset) / containerSurface) * 100),
        0
      );

      const newValue2 = Math.min(100 - newValue, 100);

      setFlexBasisCol1(newValue);
      setFlexBasisCol2(newValue2);
    }
  };

  useEffect(() => {
    if (slotTwo) {
      setFlexBasisCol1(slotTwo.initialWidth ? 100 - slotTwo.initialWidth : 50);
      setFlexBasisCol2(slotTwo.initialWidth ?? 50);
    }
  }, [slotTwo]);

  return (
    <EuiFlyout onClose={onClose} size={size} ownFocus={false}>
      {isSwitchable && slotTwo ? (
        <EuiButtonIcon
          data-test-subj="observabilityAiAssistantMultiPaneFlyoutButton"
          iconType="transitionTopIn"
          style={{
            appearance: 'none',
            cursor: 'pointer',
            blockSize: '24px',
            color: '#343741',
            position: 'absolute',
            insetInlineEnd: 32,
            insetBlockStart: 8,
            zIndex: 3,
          }}
          onClick={() => setFlexDirectionState(flexDirectionState === 'row' ? 'column' : 'row')}
        />
      ) : null}
      <EuiFlexGroup
        direction={flexDirectionState}
        gutterSize={'none'}
        style={{ height: '100%' }}
        ref={containerRef}
      >
        <EuiFlexItem
          style={{
            flexBasis: `${flexBasisCol1}%`,
            ...(slotTwo
              ? flexDirectionState === 'row'
                ? { borderRight: `solid 1px ${euiThemeVars.euiBorderColor}` }
                : { borderBottom: `solid 1px ${euiThemeVars.euiBorderColor}` }
              : {}),
          }}
        >
          <Slot title={slotOne.title} content={slotOne.content} />
        </EuiFlexItem>
        {slotTwo ? (
          <>
            <div
              draggable
              style={{
                display: 'flex',
                flexShrink: 0,
                height: flexDirectionState === 'row' ? '100%' : 5,
                width: flexDirectionState === 'row' ? 5 : '100%',
                cursor: flexDirectionState === 'row' ? 'col-resize' : 'row-resize',
                opacity: 0,
              }}
              onDrag={handleDrag}
            />

            <EuiFlexItem
              style={{
                flexBasis: `${flexBasisCol2}%`,
                height: '100%',
              }}
            >
              <Slot title={slotTwo.title} content={slotTwo.content} />
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </EuiFlyout>
  );
}

function Slot({ title, content }: { title?: string; content: JSX.Element }) {
  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
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
