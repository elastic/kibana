import { EuiButton } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';

const ResetButton = () => {
  const resetEcsMappingFormState = useGlobalStore((state) => state.resetEcsMappingFormState);
  const resetChainItemsState = useGlobalStore((state) => state.resetChainItemsState);
  const resetEcsMappingTableState = useGlobalStore((state) => state.resetEcsMappingTableState);
  const resetIntegrationBuilderStepsState = useGlobalStore((state) => state.resetIntegrationBuilderStepsState);
  const resetContinueButtonState = useGlobalStore((state) => state.resetContinueButtonState);
  const resetIsLoadingState = useGlobalStore((state) => state.resetIsLoadingState);

  const onResetClick = () => {
    resetEcsMappingFormState();
    resetChainItemsState();
    resetEcsMappingTableState();
    resetIntegrationBuilderStepsState();
    resetContinueButtonState();
    resetIsLoadingState();
  };

  return (
    <EuiButton color="warning" aria-label="reset-button" onClick={onResetClick}>
      Reset
    </EuiButton>
  );
};

export default ResetButton;
