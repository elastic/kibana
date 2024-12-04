import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { createHtmlPortalNode, OutPortal, InPortal } from 'react-reverse-portal';

import { useNavigationContext } from '@kbn/security-solution-navigation/src/context';
import { AssistantHeaderLink } from '../../../assistant/header_link';


export default function NavControls() {
    const services = useNavigationContext()
    const portalNode = React.useMemo(() => createHtmlPortalNode(), []);

    useEffect(() => {
        const registerPortalNode = () => {
            services.chrome.navControls.registerRight({
                mount: (element: HTMLElement) => {
                    ReactDOM.render(
                        <OutPortal node={portalNode} />
                        , element
                    )
                    return () => ReactDOM.unmountComponentAtNode(element)
                },
                // right before the user profile
                order: 1001,
            })
        }

        registerPortalNode()
    }, [])

    return (
        <InPortal node={portalNode}>
            <AssistantHeaderLink />
        </InPortal>
    );
}
