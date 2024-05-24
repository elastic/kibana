import { useGlobalStore } from '@Stores/useGlobalStore';
import { EuiFlexGroup } from '@elastic/eui';
import { getCategorization } from '@Api/services/categorizationService';
import RoutePaths from '@Constants/routePaths';

import ContinueButton from '@Components/Buttons/ContinueButton';
import ActionButton from '@Components/Buttons/ActionButton';
import GoBackButton from '@Components/Buttons/GoBackButton';

const CategorizationButtons = () => {
  const packageName = useGlobalStore((state) => state.packageName);
  const dataStreamName = useGlobalStore((state) => state.dataStreamName);
  const formSamples = useGlobalStore((state) => state.formSamples);
  const categorizationIsLoading = useGlobalStore((state) => state.categorizationIsLoading);
  const categorizationButtonContinue = useGlobalStore((state) => state.categorizationButtonContinue);
  const ingestPipeline = useGlobalStore((state) => state.ingestPipeline);
  const setIsLoadingState = useGlobalStore((state) => state.setIsLoadingState);
  const setIntegrationBuilderChainItemsState = useGlobalStore((state) => state.setIntegrationBuilderChainItemsState);
  const setContinueButtonState = useGlobalStore((state) => state.setContinueButtonState);
  const setIsPortalLoadingState = useGlobalStore((state) => state.setIsPortalLoadingState);

  const onCreateCategorizationClick = async () => {
    setIsLoadingState('categorizationIsLoading', true);
    setIsPortalLoadingState(true);
    if (ingestPipeline === undefined) {
      setIsLoadingState('categorizationIsLoading', false);
      setIsPortalLoadingState(false);
      return;
    }
    const req = { packageName, dataStreamName, formSamples, ingestPipeline };
    const response = await getCategorization(req);
    if (response.results.pipeline !== undefined) {
      setIntegrationBuilderChainItemsState('ingestPipeline', response.results.pipeline);
      setIntegrationBuilderChainItemsState('docs', response.results.docs);
      setContinueButtonState('categorizationButtonContinue', true);
    }
    setIsLoadingState('categorizationIsLoading', false);
    setIsPortalLoadingState(false);
  };

  return (
    <EuiFlexGroup>
      <ActionButton
        text="Add Categorization"
        isLoading={categorizationIsLoading}
        isDisabled={categorizationButtonContinue}
        onActionClick={onCreateCategorizationClick}
      />
      <ContinueButton
        continuePath={RoutePaths.RELATED_PATH}
        isDisabled={!categorizationButtonContinue}
        currentStep='integrationBuilderStep3'
        completeStep='integrationBuilderStep2'
      />
      <GoBackButton path={RoutePaths.ECS_MAPPING_PATH} />
    </EuiFlexGroup>
  );
};

export default CategorizationButtons;
