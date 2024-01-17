/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiPanel } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

interface InlineEditingContent {
  visible?: boolean;
}

interface MultiPaneFlyoutProps {
  mainContent: JSX.Element;
  secondSlotContentVisibility: boolean;
  setSecondSlotContainer?: (element: HTMLDivElement | null) => void;
  onClose: () => void;
}

export function MultiPaneFlyout({
  mainContent,
  secondSlotContentVisibility,
  onClose,
  setSecondSlotContainer,
}: MultiPaneFlyoutProps) {
  const [flexBasisCol1, setFlexBasisCol1] = useState('100%');
  const [flexBasisCol2, setFlexBasisCol2] = useState(!secondSlotContentVisibility ? '0%' : '30%');

  useEffect(() => {
    setFlexBasisCol1(secondSlotContentVisibility ? '70%' : '100%');
    setFlexBasisCol2(secondSlotContentVisibility ? '30%' : '0%');
  }, [secondSlotContentVisibility]);

  return (
    <EuiFlyout onClose={onClose} size={secondSlotContentVisibility ? 'l' : 'm'} outsideClickCloses>
      <EuiFlexGroup direction="row" gutterSize={'none'} style={{ height: '100%' }}>
        <EuiFlexItem
          style={{
            flexBasis: flexBasisCol1,
            ...(secondSlotContentVisibility
              ? { borderRight: `solid 1px ${euiThemeVars.euiBorderColor}` }
              : {}),
          }}
        >
          <MainContent content={mainContent} />
        </EuiFlexItem>

        <EuiFlexItem
          style={{
            flexBasis: flexBasisCol2,
            height: '100%',
          }}
        >
          <InlineEditingContent
            setContainer={setSecondSlotContainer}
            visible={secondSlotContentVisibility}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyout>
  );
}

function InlineEditingContent({
  visible,
  setContainer,
}: {
  visible?: boolean;
  setContainer?: (element: HTMLDivElement | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const style = css`
    padding: 0;
    position: relative;
    block-size: 100%;
   }
`;

  useEffect(() => {
    if (containerRef?.current && setContainer) {
      setContainer(containerRef.current);
    }
  }, [setContainer]);
  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m" css={style}>
      <EuiFlexGroup
        className="lnsConfigPanel__overlay"
        css={css`
           block-size: ${visible ? '100%' : 0};
          }
        `}
        direction="column"
        ref={containerRef}
        gutterSize="none"
      />
    </EuiPanel>
  );
}

function MainContent({ content }: { content: JSX.Element }) {
  const style = css`
    padding-top: ${euiThemeVars.euiSizeM};
    padding-botton: ${euiThemeVars.euiSizeM};
    block-size: 100%;
   }
  `;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m" css={style}>
      {content}
    </EuiPanel>
  );
}
