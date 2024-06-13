import React, { useState } from 'react';

import { EuiBadge, EuiButton, EuiPopover, EuiPopoverFooter, EuiPopoverTitle, EuiText } from '@elastic/eui';


export const PackagePolicyAgentlessCell = ({
    agentCount = 0,
    onAddAgent,
    canAddAgents,
  }: {
    agentCount?: number;
    onAddAgent: () => void;
    canAddAgents: boolean;
  }) => {

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  
    const onButtonClick = () =>
      setIsPopoverOpen((isPopoverOpen3) => !isPopoverOpen3);
    const closePopover = () => setIsPopoverOpen(false);
    
     if(agentCount === 0)
     return <EuiPopover
          button={
          <EuiButton color="warning" size="s" onClick={onButtonClick}>
           Pending Deployment
          </EuiButton>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="upCenter"
        >
          <EuiPopoverTitle>Agentless Deployment</EuiPopoverTitle>
          <div style={{ width: '300px' }}>
            <EuiText size="s">
              <p>
                Agentless Deployment is in pending state. Click below to view the agentless data ingested status
              </p>
            </EuiText>
          </div>
          <EuiPopoverFooter>
            <EuiButton onClick={()=>{
              closePopover();
              onAddAgent();
              }} 
              fullWidth size="s">
              View Agentless Status
            </EuiButton>
          </EuiPopoverFooter>
        </EuiPopover>

    return <EuiBadge color="success" >
    Healthy
   </EuiBadge>

  };
