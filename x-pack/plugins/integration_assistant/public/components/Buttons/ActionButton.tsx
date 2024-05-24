import { EuiButton } from '@elastic/eui';
import { MouseEventHandler } from 'react';

interface ActionButtonProps {
  text: string;
  onActionClick: MouseEventHandler;
  isLoading?: boolean;
  isDisabled?: boolean;
}

const ActionButton = ({ text, onActionClick, isLoading = false, isDisabled = false }: ActionButtonProps) => {
  return (
    <EuiButton fill isDisabled={isDisabled} isLoading={isLoading} aria-label="action-button" onClick={onActionClick}>
      {text}
    </EuiButton>
  );
};

export default ActionButton;
