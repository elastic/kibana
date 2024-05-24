import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import EcsFormStats from '@Components/Ecs/EcsFormStats';
import EcsButtons from '@components/Ecs/EcsButtons';
import EcsForm from '@Components/Ecs/EcsForm';
import EcsTable from '@Components/Ecs/EcsTable';


const EcsMapperPage = () => {
  const ecsMappingTableState = useGlobalStore((state) => state.ecsMappingTableState);
  return (
      <EuiPageTemplate.Section alignment="center">
        {ecsMappingTableState.length <= 0 && <EcsForm />}
        {ecsMappingTableState.length >= 1 && (
          <>
            <EcsFormStats />
            <EuiSpacer />
            <EcsTable />
            <EuiSpacer />
            <EcsButtons />
          </>
        )}
      </EuiPageTemplate.Section>
  );
};

export default EcsMapperPage;
