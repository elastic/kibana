import { EuiFlexGroup } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import { getEcsMapping, formatEcsResponse } from '@Api/services/ecsMappingService';
import RoutePaths from '@Constants/routePaths';
import ContinueButton from '@Components/Buttons/ContinueButton';
import ActionButton from '@Components/Buttons/ActionButton';
import ResetButton from '@components/Buttons/ResetButton';

const EcsButtons = () => {
  const packageName = useGlobalStore((state) => state.packageName);
  const dataStreamName = useGlobalStore((state) => state.dataStreamName);
  const formSamples = useGlobalStore((state) => state.formSamples);
  const ecsMappingIsLoading = useGlobalStore((state) => state.ecsMappingIsLoading);
  const ecsButtonContinue = useGlobalStore((state) => state.ecsButtonContinue);
  const setEcsMappingTableState = useGlobalStore((state) => state.setEcsMappingTableState);
  const setEcsMappingTableItemsWithEcs = useGlobalStore((state) => state.setEcsMappingTableItemsWithEcs);
  const setIntegrationBuilderChainItemsState = useGlobalStore((state) => state.setIntegrationBuilderChainItemsState);
  const setIsLoadingState = useGlobalStore((state) => state.setIsLoadingState);
  const setContinueButtonState = useGlobalStore((state) => state.setContinueButtonState);
  const setIsPortalLoadingState = useGlobalStore((state) => state.setIsPortalLoadingState);

  const onCreateEcsMappingClick = async () => {
    setIsLoadingState('ecsMappingIsLoading', true);
    setIsPortalLoadingState(true);
    const req = { packageName, dataStreamName, formSamples };
    const response = await getEcsMapping(req);
    if (response.results.mapping !== undefined) {
      setIntegrationBuilderChainItemsState('mapping', response.results.mapping);
      setIntegrationBuilderChainItemsState('ingestPipeline', response.results.current_pipeline);

      const formatedEcsTableData = formatEcsResponse(response, packageName, dataStreamName, formSamples);
      setEcsMappingTableState(formatedEcsTableData);

      const count = formatedEcsTableData.filter((item) => item.isEcs === true).length;
      setEcsMappingTableItemsWithEcs(count);

      setContinueButtonState('ecsButtonContinue', true);
    }
    setIsLoadingState('ecsMappingIsLoading', false);
    setIsPortalLoadingState(false);
  };
  return (
    <EuiFlexGroup>
      <ActionButton
        text="Create ECS Mapping"
        isLoading={ecsMappingIsLoading}
        isDisabled={ecsButtonContinue}
        onActionClick={onCreateEcsMappingClick}
      />
      <ContinueButton continuePath={RoutePaths.CATEGORIZATION_PATH} isDisabled={!ecsButtonContinue} currentStep='integrationBuilderStep2' completeStep='integrationBuilderStep1'/>
      <ResetButton />
    </EuiFlexGroup>
  );
};

export default EcsButtons;
