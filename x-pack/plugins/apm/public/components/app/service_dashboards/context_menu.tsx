import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';

type Props = {
  items: React.ReactNode[];
};

export function ContextMenu({ items }: Props) {
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          display="base"
          size="s"
          iconType="boxesVertical"
          aria-label="More"
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        size="s"
        items={items.map((item: React.ReactNode) => (
          <EuiContextMenuItem size="s"> {item}</EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
}
