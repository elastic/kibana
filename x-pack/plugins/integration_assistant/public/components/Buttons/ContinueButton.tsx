import { EuiButton } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import { useNavigate } from 'react-router-dom';

interface ContinueButtonProps {
  continuePath: string;
  isDisabled: boolean;
  currentStep: string;
  completeStep: string
}

const ContinueButton = ({ continuePath, isDisabled, currentStep, completeStep }: ContinueButtonProps) => {
  const setSelected = useGlobalStore((state) => state.setSelected);
  const setIntegrationBuilderStepsState = useGlobalStore((state) => state.setIntegrationBuilderStepsState);

  const navigate = useNavigate();
  const selectAndNavigate = (path) => {
    setSelected(path);
    navigate(path);
  };

  const onContinueClick = () => {
    selectAndNavigate(continuePath);
    setIntegrationBuilderStepsState(completeStep, 'complete');
    setIntegrationBuilderStepsState(currentStep, 'current');
  };

  return (
    <EuiButton
      isDisabled={isDisabled}
      fill={!isDisabled}
      color="success"
      aria-label="continue-button"
      onClick={onContinueClick}
    >
      Continue
    </EuiButton>
  );
};

export default ContinueButton;
