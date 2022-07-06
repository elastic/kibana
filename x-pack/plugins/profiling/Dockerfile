FROM ubuntu:21.10

RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Install base dependencies
RUN apt-get update

RUN DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata

RUN apt-get install -y -q --no-install-recommends \
       apt-transport-https \
       build-essential \
       ca-certificates \
       curl \
       git \
       libssl-dev \
       python3 \
       wget \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -ms /bin/bash -d /kibana kibana

# Install and setup nvm and node
USER kibana

ARG NODE_VERSION

ENV NVM_VERSION v0.39.1
ENV NVM_DIR /kibana/nvm

RUN mkdir $NVM_DIR \
    && cd $NVM_DIR \
    && curl https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh | bash \
    && . ./nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Install yarn
USER kibana
WORKDIR /kibana
RUN npm install -g yarn

WORKDIR /kibana/src
CMD ["bash"]
