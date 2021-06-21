/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface HostIsolationPendingResponse {
  pendingActions: number;
}

export const useHostIsolationPending = ({
  agentId,
}: {
  agentId: string;
}): HostIsolationPendingResponse => {
 const [pendingActions, setPendingActions] = useState(0);

  const { addError } = useAppToasts();

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const { data } = await fetchPendingActionsByAgentId(agentIds: agentId);
        if (isMounted) {
          setPendingActions(data.)
};
