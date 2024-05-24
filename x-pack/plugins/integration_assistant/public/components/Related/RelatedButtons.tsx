import { useGlobalStore } from '@Stores/useGlobalStore';
import { EuiFlexGroup } from '@elastic/eui';
import { getCategorization } from '@Api/services/categorizationService';
import RoutePaths from '@Constants/routePaths';

import ContinueButton from '@Components/Buttons/ContinueButton';
import ActionButton from '@Components/Buttons/ActionButton';
import GoBackButton from '@Components/Buttons/GoBackButton';

const RelatedButtons = () => {
  const packageName = useGlobalStore((state) => state.packageName);
  const dataStreamName = useGlobalStore((state) => state.dataStreamName);
  const formSamples = useGlobalStore((state) => state.formSamples);
  const relatedIsLoading = useGlobalStore((state) => state.relatedIsLoading);
  const relatedButtonContinue = useGlobalStore((state) => state.relatedButtonContinue);
  const ingestPipeline = useGlobalStore((state) => state.ingestPipeline);
  const setIsLoadingState = useGlobalStore((state) => state.setIsLoadingState);
  const setIntegrationBuilderChainItemsState = useGlobalStore((state) => state.setIntegrationBuilderChainItemsState);
  const setContinueButtonState = useGlobalStore((state) => state.setContinueButtonState);
  const setIsPortalLoadingState = useGlobalStore((state) => state.setIsPortalLoadingState);

  const onCreateCategorizationClick = async () => {
    setIsLoadingState('relatedIsLoading', true);
    setIsPortalLoadingState(true);
    if (ingestPipeline === undefined) {
      setIsLoadingState('relatedIsLoading', false);
      setIsPortalLoadingState(false);
      return;
    }
    const req = { packageName, dataStreamName, formSamples, ingestPipeline };
    const response = await getCategorization(req);
    if (response.results.pipeline !== undefined) {
      setIntegrationBuilderChainItemsState('ingestPipeline', response.results.pipeline);
      setIntegrationBuilderChainItemsState('docs', response.results.docs);
      setContinueButtonState('relatedButtonContinue', true);
    }
    setIsLoadingState('relatedIsLoading', false);
    setIsPortalLoadingState(false);
  };

  return (
    <EuiFlexGroup>
      <ActionButton
        text="Add Related Fields"
        isLoading={relatedIsLoading}
        isDisabled={relatedButtonContinue}
        onActionClick={onCreateCategorizationClick}
      />
      <ContinueButton
        continuePath={RoutePaths.INTEGRATION_BUILDER_RESULTS_PATH}
        isDisabled={!relatedButtonContinue}
        currentStep='integrationBuilderStep4'
        completeStep='integrationBuilderStep3'
      />
      <GoBackButton path={RoutePaths.CATEGORIZATION_PATH} />
    </EuiFlexGroup>
  );
};

export default RelatedButtons;
